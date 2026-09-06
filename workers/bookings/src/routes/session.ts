import { jsonResponse } from "../cors";
import { getBookingByCheckoutSessionId, getBookingByReference } from "../db";
import { createStripe } from "../stripe";
import { StripeModeError } from "../stripe-guard";

/**
 * Read trusted booking state. Does not fulfil payment or send email.
 * Stripe Checkout Session is retrieved only to display provider status.
 */
export async function handleGetCheckoutSession(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id")?.trim();
  const reference = url.searchParams.get("ref")?.trim();

  if (sessionId && !sessionId.startsWith("cs_")) {
    return jsonResponse({ ok: false, code: "INVALID_SESSION", message: "session_id is required." }, 400);
  }

  try {
    let booking = sessionId ? await getBookingByCheckoutSessionId(env, sessionId) : null;
    if (!booking && reference) booking = await getBookingByReference(env, reference);

    let stripePaid = booking?.payment_status === "paid";
    let paymentStatus: string | null = booking?.payment_status ?? null;
    let sessionStatus: string | null = null;
    let amountTotal: number | null = booking?.amount_total_cents ?? null;
    let currency: string | null = booking?.currency ?? null;

    if (sessionId && (String(env.PAYMENTS_MODE) === "test" || String(env.PAYMENTS_MODE) === "live")) {
      const stripe = createStripe(env);
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      paymentStatus = session.payment_status;
      sessionStatus = session.status;
      stripePaid = session.payment_status === "paid" || stripePaid;
      amountTotal = session.amount_total ?? amountTotal;
      currency = session.currency?.toUpperCase() ?? currency;
    }

    const bookingFinalised = Boolean(
      booking && booking.status !== "payment_pending" && booking.status !== "draft" && booking.status !== "payment_failed",
    );

    return jsonResponse({
      ok: true,
      sessionId: sessionId || booking?.stripe_checkout_session_id || null,
      paymentStatus,
      sessionStatus,
      stripePaid,
      bookingFinalised,
      reference: booking?.booking_reference ?? reference ?? null,
      status: booking?.status ?? null,
      payment_status: booking?.payment_status ?? null,
      productId: booking?.product_id ?? null,
      productName: booking?.product_name ?? null,
      cruiseDate: booking?.cruise_date ?? null,
      shipName: booking?.ship_name ?? null,
      guestCount: booking?.guest_count ?? null,
      amountTotal,
      currency,
      customerName: booking?.customer_name ?? null,
      customerEmail: booking?.customer_email ?? null,
    });
  } catch (err) {
    if (err instanceof StripeModeError) {
      return jsonResponse({ ok: false, code: err.code, message: err.message }, 503);
    }
    console.error("get_session_failed", String(err));
    return jsonResponse({ ok: false, code: "VERIFY", message: "Could not verify payment session." }, 502);
  }
}
