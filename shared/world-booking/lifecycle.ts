import type { BookingLifecycleStatus, BookingMode, PaymentSettlement } from "./types";

const CUSTOMER_SAFE_STATUS_LABEL: Record<BookingLifecycleStatus, string> = {
  draft: "Draft",
  payment_pending: "Payment pending",
  requested: "Awaiting confirmation",
  supplier_confirmation_pending: "Awaiting confirmation",
  confirmed: "Confirmed",
  supplier_declined: "Unable to confirm",
  payment_failed: "Payment unsuccessful",
  cancelled: "Cancelled",
  refund_pending: "Refund in progress",
  refunded: "Refunded",
};

export function customerStatusLabel(status: BookingLifecycleStatus): string {
  return CUSTOMER_SAFE_STATUS_LABEL[status];
}

export function isConfirmedStatus(status: BookingLifecycleStatus): boolean {
  return status === "confirmed";
}

export function isOpenRequest(status: BookingLifecycleStatus): boolean {
  return (
    status === "requested" ||
    status === "supplier_confirmation_pending" ||
    status === "payment_pending"
  );
}

export function isPaidRequestPendingConfirmation(status: BookingLifecycleStatus): boolean {
  return status === "requested" || status === "supplier_confirmation_pending";
}

/**
 * After a successful payment/authorisation for a request product, the booking
 * is requested — never confirmed.
 */
export function statusAfterPaymentSuccess(mode: BookingMode): BookingLifecycleStatus {
  if (mode === "instant") return "confirmed";
  if (mode === "request") return "requested";
  return "draft";
}

export function statusAfterSupplierConfirm(mode: BookingMode): BookingLifecycleStatus {
  void mode;
  return "confirmed";
}

export function statusAfterSupplierDecline(): BookingLifecycleStatus {
  return "supplier_declined";
}

export function paymentActionAfterDecline(settlement: PaymentSettlement): "release_authorisation" | "refund" | "none" {
  if (settlement === "authorise_capture") return "release_authorisation";
  if (settlement === "charge_refund") return "refund";
  return "none";
}

export function paymentActionAfterConfirm(settlement: PaymentSettlement): "capture" | "already_charged" | "none" {
  if (settlement === "authorise_capture") return "capture";
  if (settlement === "charge_refund") return "already_charged";
  return "none";
}
