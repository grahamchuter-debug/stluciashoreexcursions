import { paymentActionAfterDecline } from "../../../shared/world-booking";
import { findStLuciaBookingProduct } from "../../../shared/destinations/st-lucia-products";
import { getBookingByReference, updateBookingState } from "./db";
import { deliverOutboxForBooking } from "./email";
import { fulfillPaidBooking } from "./fulfill";
import { formatMajorMoneyForEmail } from "./logic";
import { enqueueConfirmationEmail, enqueueDeclineEmail } from "./notify";
import { recordOperatorAudit } from "./operator-tokens";
import { createStripe } from "./stripe";
import { StripeModeError } from "./stripe-guard";

export type OperatorActionSource = "header" | "token";

export type OperatorActionContext = {
  source: OperatorActionSource;
  tokenId?: string | null;
  /** Internal audit only — never sent to the customer. */
  auditDetail?: string | null;
};

export type ConfirmBookingResult =
  | { ok: true; reference: string; status: string; payment_status: string; duplicate?: boolean }
  | { ok: false; code: string; message: string; httpStatus: number };

export type DeclineBookingResult =
  | {
      ok: true;
      reference: string;
      status: string;
      payment_status: string;
      refundId?: string | null;
      refundStatus?: string | null;
      refunded?: boolean;
      amountRefundedCents?: number | null;
      duplicate?: boolean;
    }
  | { ok: false; code: string; message: string; httpStatus: number };

function guestsFromBooking(booking: Awaited<ReturnType<typeof getBookingByReference>> & object) {
  return {
    adults: booking.adults || booking.guest_count,
    children: booking.children,
    infants: booking.infants,
  };
}

async function syncPaidBookingFromStripe(env: Env, booking: NonNullable<Awaited<ReturnType<typeof getBookingByReference>>>) {
  if (!booking.stripe_checkout_session_id) return booking;
  try {
    const stripe = createStripe(env);
    const session = await stripe.checkout.sessions.retrieve(booking.stripe_checkout_session_id);
    if (session.payment_status === "paid") {
      const paymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
      return (await fulfillPaidBooking(env, booking, { paymentIntentId })) ?? booking;
    }
  } catch (err) {
    if (err instanceof StripeModeError) throw err;
    console.warn("operator_stripe_retrieve_failed", String(err));
  }
  return booking;
}

export async function confirmBooking(
  env: Env,
  reference: string,
  ctx: OperatorActionContext,
): Promise<ConfirmBookingResult> {
  let booking = await getBookingByReference(env, reference);
  if (!booking) {
    await recordOperatorAudit(env, {
      bookingReference: reference,
      actionType: "confirm",
      result: "not_found",
      source: ctx.source,
      tokenId: ctx.tokenId,
    });
    return { ok: false, code: "NOT_FOUND", message: "Booking not found.", httpStatus: 404 };
  }

  if (booking.status === "confirmed") {
    await recordOperatorAudit(env, {
      bookingReference: reference,
      actionType: "confirm",
      result: "duplicate",
      source: ctx.source,
      tokenId: ctx.tokenId,
    });
    return {
      ok: true,
      reference: booking.booking_reference,
      status: booking.status,
      payment_status: booking.payment_status,
      duplicate: true,
    };
  }

  if (booking.status === "supplier_declined" || booking.payment_status === "refunded") {
    await recordOperatorAudit(env, {
      bookingReference: reference,
      actionType: "confirm",
      result: "already_declined",
      source: ctx.source,
      tokenId: ctx.tokenId,
    });
    return {
      ok: false,
      code: "ALREADY_DECLINED",
      message: "This booking was declined and refunded. It cannot be confirmed.",
      httpStatus: 409,
    };
  }

  try {
    booking = await syncPaidBookingFromStripe(env, booking);
  } catch (err) {
    if (err instanceof StripeModeError) {
      return { ok: false, code: err.code, message: err.message, httpStatus: 503 };
    }
    throw err;
  }

  if (booking.payment_status !== "paid") {
    await recordOperatorAudit(env, {
      bookingReference: reference,
      actionType: "confirm",
      result: "not_paid",
      source: ctx.source,
      tokenId: ctx.tokenId,
    });
    return {
      ok: false,
      code: "NOT_PAID",
      message: "Payment is not confirmed yet. Cannot confirm the excursion.",
      httpStatus: 409,
    };
  }

  if (booking.status !== "requested" && booking.status !== "supplier_confirmation_pending") {
    await recordOperatorAudit(env, {
      bookingReference: reference,
      actionType: "confirm",
      result: `blocked_status_${booking.status}`,
      source: ctx.source,
      tokenId: ctx.tokenId,
    });
    return {
      ok: false,
      code: "INVALID_STATUS",
      message: "This booking is not awaiting supplier confirmation.",
      httpStatus: 409,
    };
  }

  await updateBookingState(env, booking.booking_reference, { status: "confirmed" });
  const updated = await getBookingByReference(env, booking.booking_reference);
  if (updated) {
    await enqueueConfirmationEmail(env, updated);
    await deliverOutboxForBooking(env, updated.booking_reference);
  }

  await recordOperatorAudit(env, {
    bookingReference: reference,
    actionType: "confirm",
    result: "confirmed",
    source: ctx.source,
    tokenId: ctx.tokenId,
  });

  return {
    ok: true,
    reference: booking.booking_reference,
    status: updated?.status ?? "confirmed",
    payment_status: updated?.payment_status ?? "paid",
  };
}

export async function declineBooking(
  env: Env,
  reference: string,
  ctx: OperatorActionContext,
): Promise<DeclineBookingResult> {
  let booking = await getBookingByReference(env, reference);
  if (!booking) {
    await recordOperatorAudit(env, {
      bookingReference: reference,
      actionType: "decline",
      result: "not_found",
      source: ctx.source,
      tokenId: ctx.tokenId,
    });
    return { ok: false, code: "NOT_FOUND", message: "Booking not found.", httpStatus: 404 };
  }

  const product = findStLuciaBookingProduct(booking.product_id);
  const settlement = product?.paymentSettlement ?? "charge_refund";
  if (paymentActionAfterDecline(settlement) !== "refund") {
    return { ok: false, code: "SETTLEMENT", message: "This product does not refund on decline.", httpStatus: 409 };
  }

  if (booking.payment_status === "refunded" || booking.stripe_refund_id) {
    await recordOperatorAudit(env, {
      bookingReference: reference,
      actionType: "decline",
      result: "duplicate",
      source: ctx.source,
      tokenId: ctx.tokenId,
      detail: booking.stripe_refund_id,
    });
    return {
      ok: true,
      reference: booking.booking_reference,
      status: booking.status === "confirmed" ? booking.status : "supplier_declined",
      payment_status: booking.payment_status === "refunded" ? "refunded" : booking.payment_status,
      refundId: booking.stripe_refund_id,
      refunded: booking.payment_status === "refunded",
      duplicate: true,
    };
  }

  if (booking.status === "confirmed") {
    await recordOperatorAudit(env, {
      bookingReference: reference,
      actionType: "decline",
      result: "already_confirmed",
      source: ctx.source,
      tokenId: ctx.tokenId,
    });
    return {
      ok: false,
      code: "ALREADY_CONFIRMED",
      message: "This booking is already confirmed. Use manual support if a refund is still required.",
      httpStatus: 409,
    };
  }

  let paymentIntentId = booking.stripe_payment_intent_id;
  try {
    booking = await syncPaidBookingFromStripe(env, booking);
    paymentIntentId = booking.stripe_payment_intent_id ?? paymentIntentId;
  } catch (err) {
    if (err instanceof StripeModeError) {
      return { ok: false, code: err.code, message: err.message, httpStatus: 503 };
    }
    throw err;
  }

  if (booking.payment_status !== "paid" && booking.payment_status !== "refund_pending") {
    await recordOperatorAudit(env, {
      bookingReference: reference,
      actionType: "decline",
      result: "not_paid",
      source: ctx.source,
      tokenId: ctx.tokenId,
    });
    return {
      ok: false,
      code: "NOT_PAID",
      message: "Payment is not confirmed yet. Cannot refund.",
      httpStatus: 409,
    };
  }

  if (!paymentIntentId) {
    return { ok: false, code: "NO_PAYMENT", message: "No Stripe payment to refund.", httpStatus: 409 };
  }

  try {
    const stripe = createStripe(env);
    const refund = await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        reason: "requested_by_customer",
        metadata: {
          booking_ref: booking.booking_reference,
          product_id: booking.product_id,
          destination: booking.destination_id,
        },
      },
      { idempotencyKey: `refund:${booking.booking_reference}` },
    );

    await updateBookingState(env, booking.booking_reference, {
      status: "supplier_declined",
      payment_status: refund.status === "succeeded" ? "refunded" : "refund_pending",
      stripe_payment_intent_id: paymentIntentId,
      stripe_refund_id: refund.id,
    });

    const updated = await getBookingByReference(env, booking.booking_reference);
    if (updated) {
      await enqueueDeclineEmail(
        env,
        updated,
        formatMajorMoneyForEmail(Math.round((refund.amount ?? updated.amount_total_cents) / 100), updated.currency),
      );
      await deliverOutboxForBooking(env, updated.booking_reference);
    }

    await recordOperatorAudit(env, {
      bookingReference: reference,
      actionType: "decline",
      result: refund.status === "succeeded" ? "refunded" : "refund_pending",
      source: ctx.source,
      tokenId: ctx.tokenId,
      detail: [refund.id, ctx.auditDetail].filter(Boolean).join(" | ").slice(0, 400) || refund.id,
    });

    return {
      ok: true,
      reference: booking.booking_reference,
      status: updated?.status ?? "supplier_declined",
      payment_status: updated?.payment_status ?? "refunded",
      refundId: refund.id,
      refundStatus: refund.status,
      refunded: refund.status === "succeeded",
      amountRefundedCents: refund.amount,
    };
  } catch (err) {
    if (err instanceof StripeModeError) {
      return { ok: false, code: err.code, message: err.message, httpStatus: 503 };
    }
    console.error("operator_refund_failed", String(err));
    await recordOperatorAudit(env, {
      bookingReference: reference,
      actionType: "decline",
      result: "refund_failed",
      source: ctx.source,
      tokenId: ctx.tokenId,
      detail: String(err).slice(0, 200),
    });
    return { ok: false, code: "REFUND", message: "Could not create Stripe refund. No booking state was changed to refunded.", httpStatus: 502 };
  }
}

export { guestsFromBooking };
