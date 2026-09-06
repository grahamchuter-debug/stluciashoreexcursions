export {
  assertClientTotalMatches,
  calculateBookingQuote,
  createBookingReference,
  createIdempotencyKey,
  checkoutIdempotencyMaterial,
  requestedCustomerEmail,
  statusAfterPaymentSuccess,
  supplierRequestEmail,
  validateCustomer,
  validateCruise,
} from "../../../shared/world-booking";

export function formatMajorMoneyForEmail(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}
