import type Stripe from "stripe";
import { jsonResponse } from "../cors";
import { claimEvent, eventAlreadyProcessed, getBookingByPaymentIntentId } from "../db";
import { deliverOutboxForBooking } from "../email";
import {
  fulfillCheckoutSession,
  markPaymentFailedFromIntent,
  markPaymentFailedFromSession,
  markRefundedFromCharge,
} from "../fulfill";
import { LIVE_PAYMENTS_CODE_ENABLED } from "../live-gate";
import { enqueuePostPaymentNotifications } from "../notify";
import { createStripe } from "../stripe";
import { StripeModeError } from "../stripe-guard";

async function scheduleOutbox(env: Env, reference: string, ctx?: ExecutionContext): Promise<void> {
  const run = deliverOutboxForBooking(env, reference);
  if (ctx?.waitUntil) ctx.waitUntil(run);
  else await run;
}

export async function handleStripeWebhook(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
  if (String(env.PAYMENTS_MODE) === "live" && !LIVE_PAYMENTS_CODE_ENABLED) {
    return jsonResponse({ ok: false, code: "LIVE_PAYMENTS_BLOCKED", message: "Live webhooks are disabled." }, 503);
  }
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return jsonResponse({ ok: false, code: "WEBHOOK_SECRET", message: "Webhook secret not configured." }, 503);
  }

  const signature = request.headers.get("Stripe-Signature");
  if (!signature) {
    return jsonResponse({ ok: false, code: "SIGNATURE", message: "Missing Stripe-Signature." }, 400);
  }

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    const stripe = createStripe(env);
    event = await stripe.webhooks.constructEventAsync(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    if (err instanceof StripeModeError) {
      return jsonResponse({ ok: false, code: err.code, message: err.message }, 503);
    }
    console.error("webhook_signature_invalid", String(err));
    return jsonResponse({ ok: false, code: "SIGNATURE", message: "Invalid signature." }, 400);
  }

  if (await eventAlreadyProcessed(env, event.id)) {
    return jsonResponse({ ok: true, received: true, duplicate: true });
  }

  const bookingRefHint =
    (event.data.object as { client_reference_id?: string | null; metadata?: { booking_ref?: string } }).client_reference_id ??
    (event.data.object as { metadata?: { booking_ref?: string } }).metadata?.booking_ref ??
    null;

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        const booking = await fulfillCheckoutSession(env, session);
        if (booking) {
          await enqueuePostPaymentNotifications(env, booking);
          await scheduleOutbox(env, booking.booking_reference, ctx);
        }
        break;
      }
      case "checkout.session.async_payment_failed": {
        await markPaymentFailedFromSession(env, event.data.object as Stripe.Checkout.Session);
        break;
      }
      case "payment_intent.payment_failed": {
        await markPaymentFailedFromIntent(env, event.data.object as Stripe.PaymentIntent);
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId =
          typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id ?? null;
        if (paymentIntentId) {
          const fullyRefunded =
            charge.refunded || (typeof charge.amount_refunded === "number" && charge.amount_refunded >= charge.amount);
          await markRefundedFromCharge(env, paymentIntentId, fullyRefunded);
        }
        break;
      }
      case "refund.updated": {
        const refund = event.data.object as Stripe.Refund;
        if (refund.status === "succeeded") {
          const paymentIntentId =
            typeof refund.payment_intent === "string" ? refund.payment_intent : refund.payment_intent?.id ?? null;
          if (paymentIntentId) {
            const booking = await getBookingByPaymentIntentId(env, paymentIntentId);
            if (booking && booking.payment_status !== "refunded") {
              await markRefundedFromCharge(env, paymentIntentId, true);
            }
          }
        }
        break;
      }
      default:
        break;
    }

    await claimEvent(env, event.id, event.type, bookingRefHint);
  } catch (err) {
    console.error("webhook_handler_error", event.type, String(err));
    return jsonResponse({ ok: false, code: "WEBHOOK", message: "Webhook handler failed." }, 500);
  }

  return jsonResponse({ ok: true, received: true });
}
