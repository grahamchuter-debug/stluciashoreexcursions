import { stLuciaBookingCore } from "../../../../shared/destinations/st-lucia";
import { findStLuciaBookingProduct } from "../../../../shared/destinations/st-lucia-products";
import {
  assertClientTotalMatches,
  calculateBookingQuote,
  checkoutIdempotencyMaterial,
  createBookingReference,
  createIdempotencyKey,
  isProductRequestable,
  partySize,
  sellingPricePerGuest,
  usesFlatGuestPricing,
  validateCruise,
  validateCustomer,
} from "../../../../shared/world-booking";
import type { BookableProductConfig, CreateBookingRequestInput, GuestCounts } from "../../../../shared/world-booking/types";
import { jsonResponse } from "../cors";
import {
  getBookingByIdempotencyKey,
  insertBooking,
  markCheckoutCreateFailed,
  updateBookingStripeIds,
} from "../db";
import { bookingsAreEnabled, liveCheckoutBlock } from "../live-gate";
import { createStripe } from "../stripe";
import { assertStripeTestSecret, StripeModeError } from "../stripe-guard";

function siteBaseUrl(env: Env): string {
  const raw = (env.SITE_BASE_URL || "http://localhost:3000").trim().replace(/\/$/, "");
  if (!raw) throw new Error("SITE_BASE_URL is not configured");
  return raw;
}

type StripeLineItem = {
  quantity: number;
  price_data: {
    currency: string;
    unit_amount: number;
    product_data: { name: string; description: string };
  };
};

/**
 * Server-side Stripe line items from product pricing authority.
 * Free infants (unit 0) are omitted from Stripe lines but remain on the booking record.
 * Never accepts client amounts.
 */
function buildStripeLineItems(
  product: BookableProductConfig,
  guests: GuestCounts,
  currency: string,
  lineDescription: string,
): StripeLineItem[] {
  const cur = currency.toLowerCase();
  const desc = lineDescription.slice(0, 500);
  const items: StripeLineItem[] = [];

  if (usesFlatGuestPricing(product)) {
    const n = partySize(guests);
    const unit = Math.round(sellingPricePerGuest(product) * 100);
    if (n > 0 && unit > 0) {
      items.push({
        quantity: n,
        price_data: {
          currency: cur,
          unit_amount: unit,
          product_data: { name: product.name.slice(0, 120), description: desc },
        },
      });
    }
    return items;
  }

  const bands: Array<{ count: number; unitMajor: number | null; label: string }> = [
    { count: guests.adults, unitMajor: product.pricing.adultAmount, label: "Adults" },
    { count: guests.children, unitMajor: product.pricing.childAmount, label: "Children" },
    { count: guests.infants, unitMajor: product.pricing.infantAmount, label: "Infants" },
  ];

  for (const band of bands) {
    if (band.count <= 0 || band.unitMajor == null) continue;
    const unitCents = Math.round(band.unitMajor * 100);
    if (unitCents <= 0) continue; // free infants: tracked in booking, not Stripe line
    items.push({
      quantity: band.count,
      price_data: {
        currency: cur,
        unit_amount: unitCents,
        product_data: {
          name: `${product.name.slice(0, 90)} · ${band.label}`.slice(0, 120),
          description: desc,
        },
      },
    });
  }

  return items;
}

export async function handleCreateCheckout(request: Request, env: Env): Promise<Response> {
  if (!bookingsAreEnabled(env)) {
    return jsonResponse(
      {
        ok: false,
        code: "BOOKINGS_DISABLED",
        message: "St Lucia online booking is switched off. No payment was taken.",
      },
      503,
    );
  }

  const paymentsMode = String(env.PAYMENTS_MODE);
  if (paymentsMode !== "test" && paymentsMode !== "live") {
    return jsonResponse(
      {
        ok: false,
        code: "TEST_PAYMENTS_REQUIRED",
        message: "Stripe Checkout is only available when PAYMENTS_MODE is test or live.",
      },
      503,
    );
  }

  if (paymentsMode === "test") {
    try {
      assertStripeTestSecret(env.STRIPE_SECRET_KEY);
    } catch (err) {
      if (err instanceof StripeModeError) {
        return jsonResponse({ ok: false, code: err.code, message: err.message }, 503);
      }
      throw err;
    }
  }

  const body = (await request.json().catch(() => null)) as CreateBookingRequestInput | null;
  if (!body || typeof body !== "object") {
    return jsonResponse({ ok: false, code: "INVALID_BODY", message: "Invalid booking request." }, 400);
  }

  if ("successUrl" in body || "cancelUrl" in body || "unitPrice" in body || "currency" in body || "amountCents" in body) {
    console.warn(JSON.stringify({ ignored_client_price_or_redirect: true }));
  }

  const product = findStLuciaBookingProduct(body.productId);
  if (!product || !isProductRequestable(product)) {
    return jsonResponse({ ok: false, code: "UNKNOWN_PRODUCT", message: "This excursion cannot be requested here." }, 400);
  }

  if (paymentsMode === "live") {
    const block = liveCheckoutBlock(env, product);
    if (block) return jsonResponse({ ok: false, code: block.code, message: block.message }, 503);
  }

  const customerError = validateCustomer(body.customer);
  if (customerError) return jsonResponse({ ok: false, code: "CUSTOMER", message: customerError }, 400);
  const cruiseError = validateCruise(body.cruise);
  if (cruiseError) return jsonResponse({ ok: false, code: "CRUISE", message: cruiseError }, 400);
  if (!body.confirmationAcknowledged) {
    return jsonResponse(
      { ok: false, code: "CONSENT", message: "Please acknowledge that this is a request, not a confirmation." },
      400,
    );
  }

  let quote;
  try {
    quote = calculateBookingQuote(product, body.guests);
    assertClientTotalMatches(quote, body.clientDisplayedTotalCents);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Price could not be calculated.";
    return jsonResponse({ ok: false, code: "PRICE", message }, 400);
  }

  const guestCount = partySize(body.guests);
  /** DB unit field: adult unit for banded products; flat unit for flat products. */
  const unitAmountCents = Math.round(
    (usesFlatGuestPricing(product) ? sellingPricePerGuest(product) : product.pricing.adultAmount) * 100,
  );
  const idempotencyKey = createIdempotencyKey(
    checkoutIdempotencyMaterial({
      productId: product.id,
      date: body.cruise.date,
      shipSlug: body.cruise.shipSlug,
      adults: body.guests.adults,
      children: body.guests.children,
      infants: body.guests.infants,
      email: body.customer.email,
      bookingSessionId: body.bookingSessionId,
    }),
  );

  const existing = await getBookingByIdempotencyKey(env, idempotencyKey);
  if (existing?.stripe_checkout_session_id) {
    try {
      const stripe = createStripe(env);
      const session = await stripe.checkout.sessions.retrieve(existing.stripe_checkout_session_id);
      if (session.url && session.status !== "expired") {
        return jsonResponse({
          ok: true,
          url: session.url,
          checkoutUrl: session.url,
          reference: existing.booking_reference,
          sessionId: session.id,
          status: existing.status,
          preview: paymentsMode !== "live",
        });
      }
    } catch (err) {
      console.warn("reuse_session_failed", String(err));
    }
    await markCheckoutCreateFailed(env, existing.booking_reference);
  } else if (existing && !existing.stripe_checkout_session_id) {
    await markCheckoutCreateFailed(env, existing.booking_reference);
  }

  const reference = createBookingReference(stLuciaBookingCore);
  const now = new Date().toISOString();
  const origin = siteBaseUrl(env);
  const successUrl = `${origin}${product.receivedPath}?session_id={CHECKOUT_SESSION_ID}&ref=${encodeURIComponent(reference)}`;
  const cancelUrl = `${origin}${product.bookingPath}?step=pay`;

  try {
    await insertBooking(env, {
      id: crypto.randomUUID(),
      booking_reference: reference,
      booking_session_id: body.bookingSessionId,
      destination_id: product.destinationId,
      product_id: product.id,
      product_name: product.name,
      cruise_date: body.cruise.date,
      ship_name: body.cruise.shipName,
      ship_slug: body.cruise.shipSlug,
      guest_count: guestCount,
      adults: body.guests.adults,
      children: body.guests.children,
      infants: body.guests.infants,
      unit_amount_cents: unitAmountCents,
      amount_total_cents: quote.amountCents,
      currency: quote.currency,
      customer_name: body.customer.name.trim(),
      customer_email: body.customer.email.trim().toLowerCase(),
      customer_phone: body.customer.phone.trim(),
      operational_notes: body.customer.operationalNotes?.trim() || null,
      status: "payment_pending",
      payment_status: "unpaid",
      stripe_checkout_session_id: null,
      stripe_payment_intent_id: null,
      stripe_refund_id: null,
      idempotency_key: idempotencyKey,
      payload_json: JSON.stringify(body),
      created_at: now,
      updated_at: now,
    });
  } catch (err) {
    const raced = await getBookingByIdempotencyKey(env, idempotencyKey);
    if (raced?.stripe_checkout_session_id) {
      try {
        const stripe = createStripe(env);
        const session = await stripe.checkout.sessions.retrieve(raced.stripe_checkout_session_id);
        if (session.url) {
          return jsonResponse({
            ok: true,
            url: session.url,
            checkoutUrl: session.url,
            reference: raced.booking_reference,
            sessionId: session.id,
            status: raced.status,
            preview: paymentsMode !== "live",
          });
        }
      } catch (retrieveErr) {
        console.warn("race_retrieve_failed", String(retrieveErr));
      }
    }
    console.error("insert_booking_failed", String(err));
    return jsonResponse({ ok: false, code: "PERSIST", message: "Could not create booking." }, 500);
  }

  const metadata: Record<string, string> = {
    booking_ref: reference,
    booking_session_id: body.bookingSessionId.slice(0, 40),
    product_id: product.id.slice(0, 40),
    destination: product.destinationId.slice(0, 40),
    cruise_date: body.cruise.date,
    ship: body.cruise.shipName.slice(0, 80),
    guest_count: String(guestCount),
    payments_mode: paymentsMode,
  };

  const lineDescription = [
    product.name,
    body.cruise.date,
    body.cruise.shipName,
    `${guestCount} guest${guestCount === 1 ? "" : "s"}`,
  ].join(" · ");

  const lineItems = buildStripeLineItems(product, body.guests, quote.currency, lineDescription);
  if (lineItems.length === 0) {
    await markCheckoutCreateFailed(env, reference);
    return jsonResponse({ ok: false, code: "PRICE", message: "No chargeable guests for this request." }, 400);
  }

  try {
    const stripe = createStripe(env);
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        // St Lucia: hide Link/OneLink wallet so card entry is the primary path.
        // Session-scoped — does not change Dashboard or other Wow A Tour destinations.
        wallet_options: {
          link: { display: "never" },
        },
        client_reference_id: reference,
        customer_email: body.customer.email.trim().toLowerCase(),
        customer_creation: "if_required",
        line_items: lineItems,
        metadata,
        payment_intent_data: {
          metadata,
          description: lineDescription.slice(0, 1000),
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
      },
      { idempotencyKey },
    );

    if (!session.url) {
      await markCheckoutCreateFailed(env, reference);
      return jsonResponse({ ok: false, code: "STRIPE", message: "Stripe did not return a Checkout URL." }, 502);
    }

    const paymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
    await updateBookingStripeIds(env, reference, session.id, paymentIntentId);

    return jsonResponse({
      ok: true,
      url: session.url,
      checkoutUrl: session.url,
      reference,
      sessionId: session.id,
      status: "payment_pending",
      preview: paymentsMode !== "live",
    });
  } catch (err) {
    if (err instanceof StripeModeError) {
      return jsonResponse({ ok: false, code: err.code, message: err.message }, 503);
    }
    console.error("stripe_session_create_failed", String(err));
    try {
      await markCheckoutCreateFailed(env, reference);
    } catch (markErr) {
      console.error("mark_checkout_failed_error", String(markErr));
    }
    return jsonResponse({ ok: false, code: "STRIPE", message: "Could not start secure payment." }, 502);
  }
}
