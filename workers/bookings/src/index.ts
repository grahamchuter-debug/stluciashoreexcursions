/**
 * St Lucia request-to-book Worker (shared for three St Lucia RTB products).
 *
 * Stripe TEST (PAYMENTS_MODE=test) and LIVE (PAYMENTS_MODE=live) are supported.
 * Live requires LIVE_PAYMENTS_CODE_ENABLED + LIVE_PAYMENTS_UNLOCK + sk_live_ secret.
 * TEST and LIVE keys are never interchangeable.
 * Do not alter CT-2 / Martinique / Barbados / other destinations.
 */
import { stLuciaBookingCore } from "../../../shared/destinations/st-lucia";
import { findStLuciaBookingProduct } from "../../../shared/destinations/st-lucia-products";
import {
  assertClientTotalMatches,
  calculateBookingQuote,
  checkoutIdempotencyMaterial,
  createBookingReference,
  createIdempotencyKey,
  destinationBrandFromCore,
  isProductRequestable,
  requestedCustomerEmail,
  statusAfterPaymentSuccess,
  supplierRequestEmail,
  validateCruise,
  validateCustomer,
} from "../../../shared/world-booking";
import type { CreateBookingRequestInput } from "../../../shared/world-booking/types";
import { corsHeaders, jsonResponse, withCors } from "./cors";
import { formatMajorMoneyForEmail } from "./logic";
import { handleCreateCheckout } from "./routes/checkout";
import { handleOperatorConfirm, handleOperatorDecline } from "./routes/operator";
import { handleOperatorReviewAction, handleOperatorReviewPage } from "./routes/operator-review";
import { handleGetCheckoutSession } from "./routes/session";
import { handleStripeWebhook } from "./routes/webhook";
import { isLiveStripeSecret } from "./stripe-guard";

type PreviewRecord = {
  reference: string;
  status: string;
  productId: string;
  amountCents: number;
  currency: string;
  bookingSessionId: string;
  idempotencyKey: string;
  payload: CreateBookingRequestInput;
  createdAt: string;
};

const previewMemory = new Map<string, PreviewRecord>();
const previewBySession = new Map<string, string>();

function paymentsModeValue(env: { PAYMENTS_MODE?: string }): string {
  return String(env.PAYMENTS_MODE ?? "preview");
}

const worker = {
  async fetch(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(env, request) });
    }

    if (url.pathname === "/health") {
      const mode = paymentsModeValue(env);
      return withCors(
        jsonResponse({
          ok: true,
          service: "st-lucia-bookings",
          mode,
          liveKeyPresent: isLiveStripeSecret(env.STRIPE_SECRET_KEY),
          liveKeyRejected: mode !== "live" && isLiveStripeSecret(env.STRIPE_SECRET_KEY),
        }),
        env,
        request,
      );
    }

    let response: Response;
    if (url.pathname === "/api/bookings/request" && request.method === "POST") {
      response = await handlePreviewRequest(request, env);
    } else if (url.pathname === "/api/bookings/checkout" && request.method === "POST") {
      response = await handleCreateCheckout(request, env);
    } else if (url.pathname === "/api/bookings/session" && request.method === "GET") {
      response = await handleGetCheckoutSession(request, env);
    } else if (url.pathname === "/api/stripe/webhook" && request.method === "POST") {
      response = await handleStripeWebhook(request, env, ctx);
    } else if (url.pathname === "/api/bookings/operator/confirm" && request.method === "POST") {
      response = await handleOperatorConfirm(request, env);
    } else if (url.pathname === "/api/bookings/operator/decline" && request.method === "POST") {
      response = await handleOperatorDecline(request, env);
    } else if (url.pathname === "/operator/review" && request.method === "GET") {
      response = await handleOperatorReviewPage(request, env);
    } else if (url.pathname === "/operator/review/action" && request.method === "POST") {
      response = await handleOperatorReviewAction(request, env);
    } else {
      response = jsonResponse({ ok: false, code: "NOT_FOUND", message: "Unknown route." }, 404);
    }
    return withCors(response, env, request);
  },
} satisfies ExportedHandler<Env>;

export default worker;

async function handlePreviewRequest(request: Request, env: Env): Promise<Response> {
  if (paymentsModeValue(env) === "live") {
    return jsonResponse(
      {
        ok: false,
        code: "LIVE_PAYMENTS_BLOCKED",
        message:
          "Live Stripe is not enabled for this St Lucia Worker. Charge-then-refund still requires an explicit production configuration. No payment was taken.",
      },
      503,
    );
  }

  if (paymentsModeValue(env) === "test") {
    return jsonResponse(
      {
        ok: false,
        code: "USE_CHECKOUT",
        message: "Use /api/bookings/checkout for Stripe TEST payments.",
      },
      400,
    );
  }

  const body = (await request.json().catch(() => null)) as CreateBookingRequestInput | null;
  if (!body || typeof body !== "object") {
    return jsonResponse({ ok: false, code: "INVALID_BODY", message: "Invalid booking request." }, 400);
  }

  const product = findStLuciaBookingProduct(body.productId);
  if (!product || !isProductRequestable(product)) {
    return jsonResponse({ ok: false, code: "UNKNOWN_PRODUCT", message: "This excursion cannot be requested here." }, 400);
  }

  const customerError = validateCustomer(body.customer);
  if (customerError) return jsonResponse({ ok: false, code: "CUSTOMER", message: customerError }, 400);
  const cruiseError = validateCruise(body.cruise);
  if (cruiseError) return jsonResponse({ ok: false, code: "CRUISE", message: cruiseError }, 400);
  if (!body.confirmationAcknowledged) {
    return jsonResponse({ ok: false, code: "CONSENT", message: "Please acknowledge that this is a request, not a confirmation." }, 400);
  }

  let quote;
  try {
    quote = calculateBookingQuote(product, body.guests);
    assertClientTotalMatches(quote, body.clientDisplayedTotalCents);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Price could not be calculated.";
    return jsonResponse({ ok: false, code: "PRICE", message }, 400);
  }

  const existing = previewBySession.get(body.bookingSessionId);
  if (existing) {
    const record = previewMemory.get(existing);
    if (record) {
      return jsonResponse({
        ok: true,
        reference: record.reference,
        status: record.status,
        preview: true,
        receivedPath: `${product.receivedPath}?ref=${encodeURIComponent(record.reference)}`,
      });
    }
  }

  const reference = createBookingReference(stLuciaBookingCore);
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
  const record: PreviewRecord = {
    reference,
    status: statusAfterPaymentSuccess("request"),
    productId: product.id,
    amountCents: quote.amountCents,
    currency: quote.currency,
    bookingSessionId: body.bookingSessionId,
    idempotencyKey,
    payload: body,
    createdAt: new Date().toISOString(),
  };
  previewMemory.set(reference, record);
  previewBySession.set(body.bookingSessionId, reference);

  const destinationBrand = destinationBrandFromCore(stLuciaBookingCore);
  const amountLabel = formatMajorMoneyForEmail(quote.amountMajor, quote.currency);
  const customerMail = requestedCustomerEmail({
    reference,
    product,
    cruise: body.cruise,
    guests: body.guests,
    amountLabel,
    customerName: body.customer.name,
    brand: destinationBrand,
  });
  const supplierMail = supplierRequestEmail({
    reference,
    product,
    cruise: body.cruise,
    guests: body.guests,
    customer: {
      name: body.customer.name,
      email: body.customer.email,
      phone: body.customer.phone,
    },
    amountLabel,
    operationalNotes: body.customer.operationalNotes,
    destinationLabel: "St Lucia Shore Excursions — new booking request",
  });

  console.info("preview-customer-email", customerMail.subject, customerMail.bodyLines);
  console.info("preview-supplier-email-not-sent", {
    preview: true,
    destinationConfigured: Boolean(product.supplier.notificationEmail),
    routingStatus: product.supplier.routingStatus,
    subject: supplierMail.subject,
  });

  return jsonResponse({
    ok: true,
    reference,
    status: record.status,
    preview: true,
    receivedPath: `${product.receivedPath}?ref=${encodeURIComponent(reference)}&preview=1`,
    emails: {
      customerSubject: customerMail.subject,
      supplierSubject: supplierMail.subject,
    },
  });
}
