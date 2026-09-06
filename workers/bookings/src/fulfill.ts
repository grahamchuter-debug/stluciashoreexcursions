import type Stripe from "stripe";
import {
  getBookingByCheckoutSessionId,
  getBookingByPaymentIntentId,
  getBookingByReference,
  updateBookingState,
  type BookingRow,
} from "./db";
import { statusAfterPaymentSuccess } from "../../../shared/world-booking";

type DbEnv = { DB: D1Database };

export function isPaidLifecycle(status: string): boolean {
  return (
    status === "requested" ||
    status === "supplier_confirmation_pending" ||
    status === "confirmed" ||
    status === "supplier_declined" ||
    status === "refund_pending" ||
    status === "refunded"
  );
}

export async function fulfillPaidBooking(
  env: DbEnv,
  booking: BookingRow,
  extras?: { paymentIntentId?: string | null; customerPhone?: string | null; customerEmail?: string | null; customerName?: string | null },
): Promise<BookingRow> {
  if (isPaidLifecycle(booking.status) && booking.payment_status === "paid") {
    return booking;
  }
  if (booking.status === "confirmed" || booking.status === "supplier_declined" || booking.status === "refunded") {
    return booking;
  }

  await updateBookingState(env, booking.booking_reference, {
    status: statusAfterPaymentSuccess("request"),
    payment_status: "paid",
    stripe_payment_intent_id: extras?.paymentIntentId ?? null,
    customer_phone: extras?.customerPhone ?? null,
    customer_email: extras?.customerEmail ?? null,
    customer_name: extras?.customerName ?? null,
  });
  return (await getBookingByReference(env, booking.booking_reference)) ?? booking;
}

export async function resolveBookingFromSession(env: DbEnv, session: Stripe.Checkout.Session): Promise<BookingRow | null> {
  if (session.id) {
    const bySession = await getBookingByCheckoutSessionId(env, session.id);
    if (bySession) return bySession;
  }
  const ref = session.client_reference_id ?? session.metadata?.booking_ref ?? null;
  if (ref) return getBookingByReference(env, ref);
  return null;
}

export async function fulfillCheckoutSession(env: DbEnv, session: Stripe.Checkout.Session): Promise<BookingRow | null> {
  if (session.payment_status !== "paid") return null;
  const booking = await resolveBookingFromSession(env, session);
  if (!booking) return null;
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  return fulfillPaidBooking(env, booking, {
    paymentIntentId,
    customerPhone: session.customer_details?.phone ?? null,
    customerEmail: session.customer_details?.email ?? null,
    customerName: session.customer_details?.name ?? null,
  });
}

export async function markPaymentFailedFromSession(env: DbEnv, session: Stripe.Checkout.Session): Promise<void> {
  const booking = await resolveBookingFromSession(env, session);
  if (!booking) return;
  if (isPaidLifecycle(booking.status) && booking.payment_status === "paid") return;
  await updateBookingState(env, booking.booking_reference, {
    status: "payment_failed",
    payment_status: "failed",
  });
}

export async function markPaymentFailedFromIntent(env: DbEnv, intent: Stripe.PaymentIntent): Promise<void> {
  let booking = await getBookingByPaymentIntentId(env, intent.id);
  if (!booking && intent.metadata?.booking_ref) {
    booking = await getBookingByReference(env, intent.metadata.booking_ref);
  }
  if (!booking) return;
  if (isPaidLifecycle(booking.status) && booking.payment_status === "paid") return;
  await updateBookingState(env, booking.booking_reference, {
    status: "payment_failed",
    payment_status: "failed",
    stripe_payment_intent_id: intent.id,
  });
}

export async function markRefundedFromCharge(
  env: DbEnv,
  paymentIntentId: string,
  fullyRefunded: boolean,
): Promise<void> {
  const booking = await getBookingByPaymentIntentId(env, paymentIntentId);
  if (!booking) return;
  await updateBookingState(env, booking.booking_reference, {
    status: booking.status === "confirmed" ? booking.status : booking.status === "supplier_declined" ? "supplier_declined" : "refunded",
    payment_status: fullyRefunded ? "refunded" : "refund_pending",
  });
}
