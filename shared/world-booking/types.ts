/**
 * World 2.0 booking contract — shared by destination sites and booking Workers.
 *
 * Destination-specific values live in configuration. Do not branch on
 * destination slug in platform code unless a port-specific constraint
 * cannot be expressed as data.
 */

export type BookingMode = "instant" | "request" | "enquire";

/**
 * How money is taken for a product that collects payment.
 *
 * `authorise_capture` — Stripe PaymentIntent/Checkout manual capture.
 * `charge_refund` — charge immediately, refund if the request cannot be fulfilled.
 * `preview` — no payment provider call; local/review only.
 */
export type PaymentSettlement = "authorise_capture" | "charge_refund" | "preview";

/**
 * Availability of a product (can we sell it today?), distinct from bookingMode
 * (how the customer transacts).
 */
export type ProductAvailability =
  | "comingSoon"
  | "enquiryOnly"
  | "live"
  | "soldOut"
  | "seasonal";

/**
 * Booking lifecycle. `requested` is not `confirmed`.
 */
export type BookingLifecycleStatus =
  | "draft"
  | "payment_pending"
  | "requested"
  | "supplier_confirmation_pending"
  | "confirmed"
  | "supplier_declined"
  | "payment_failed"
  | "cancelled"
  | "refund_pending"
  | "refunded";

/**
 * Money movement, kept separate from supplier confirmation.
 * A paid request is still unconfirmed until the local partner accepts it.
 */
export type BookingPaymentStatus =
  | "unpaid"
  | "paid"
  | "failed"
  | "refund_pending"
  | "refunded";

export type DestinationCurrencyCode = "EUR" | "USD" | "GBP";

export type PricingModel =
  | "flat_per_guest"
  | "per_person"
  | "adult_child"
  | "private_vehicle"
  | "capacity_based";

export type BandPricingStatus = "priced" | "needs_confirmation" | "not_sold";

export type AgeBandId = "adult" | "child" | "infant";

export type AgeBand = {
  id: AgeBandId;
  label: string;
  /** Inclusive. Null until commercially approved — do not invent ages. */
  minAge: number | null;
  /** Inclusive. Null means no upper bound, or not yet approved. */
  maxAge: number | null;
  pricingStatus: BandPricingStatus;
};

export type GuestCounts = {
  adults: number;
  children: number;
  infants: number;
};

export type QuoteLine = {
  count: number;
  unitMajor: number | null;
  totalMajor: number;
  rateStatus: BandPricingStatus;
};

export type BookingQuote = {
  currency: DestinationCurrencyCode;
  amountMajor: number;
  amountCents: number;
  payingGuestCount: number;
  partySize: number;
  pricingNeedsConfirmation: boolean;
  breakdown: {
    adults: QuoteLine;
    children: QuoteLine;
    infants: QuoteLine;
  };
};

export type RequiredCustomerField = "name" | "email" | "phone" | "whatsapp";

export type BookableWindow = {
  start: string;
  end: string;
};

export type SupplierRoutingStatus = "preview_placeholder" | "production_ready";

export type SupplierRoute = {
  id: string;
  displayName: string;
  /**
   * Ops-only. Never shown to customers.
   * Product-configurable so destinations/suppliers can differ.
   * Null / preview_placeholder must not start live Checkout.
   */
  notificationEmail: string | null;
  routingStatus: SupplierRoutingStatus;
};

export type ProductPricing = {
  model: PricingModel;
  currency: DestinationCurrencyCode;
  /**
   * Selling price for `flat_per_guest`. Falls back to `adultAmount` when omitted.
   * Kept separate so age-band products can still use adult/child/infant rates.
   */
  pricePerGuest?: number;
  adultAmount: number;
  /** Null until commercially approved. Never invent a child rate. */
  childAmount: number | null;
  childPricingStatus: BandPricingStatus;
  infantAmount: number | null;
  infantPricingStatus: BandPricingStatus;
  pricingNeedsConfirmation: boolean;
};

export type ProductCapacity = {
  minGuests: number;
  /**
   * Maximum party size for an online booking request.
   * Distinct from supplierGroupSize and maxGuestsPerGuide.
   */
  maxGuestsPerBooking: number;
  maxGuestsPerBookingSource: "approved" | "preview_unapproved";
  /** Operational tour size — do not use as the online booking cap. */
  supplierGroupSize: number | null;
  maxGuestsPerGuide: number | null;
};

export type BookableProductConfig = {
  id: string;
  destinationId: string;
  slug: string;
  name: string;
  durationLabel: string;
  bookingMode: BookingMode;
  availability: ProductAvailability;
  bookingPath: string;
  receivedPath: string;
  confirmedPath: string;
  productPath: string;
  pricing: ProductPricing;
  ageBands: readonly AgeBand[];
  capacity: ProductCapacity;
  requiredCustomerFields: readonly RequiredCustomerField[];
  supplier: SupplierRoute;
  paymentSettlement: PaymentSettlement;
  schedulePortSlug: string;
  pendingCommercialRules: readonly string[];
  /**
   * Ops-only supplier notes. Never shown in customer checkout or payment copy.
   * Use to record rules that are explicitly not part of current selling.
   */
  supplierReferenceNotes?: readonly string[];
};

export type DestinationBookingCore = {
  id: string;
  siteName: string;
  siteHostname: string;
  siteUrl: string;
  bookingEmail: string;
  originatingSite: string;
  originatingPort: string;
  /** Network format: `{prefix}-{stamp}`. Prefix is config, not ad-hoc logic. */
  bookingRefPrefix: string;
  sessionKeyPrefix: string;
  sessionKeyVersion: number;
  currencyCode: DestinationCurrencyCode;
  bookableWindow: BookableWindow;
  schedulePortSlug: string;
  customShipSlug: string;
  contactPath: string;
  termsPath: string;
  privacyPath: string;
};

export type BookingCustomer = {
  name: string;
  email: string;
  phone: string;
  /** Accessibility / operational notes only. Never payment data. */
  operationalNotes?: string;
};

export type BookingCruiseContext = {
  date: string;
  shipName: string;
  shipSlug: string;
  cruiseLine: string;
  isCustomShip: boolean;
  arrival?: string;
  departure?: string;
  scheduleMatched: boolean;
};

export type CreateBookingRequestInput = {
  productId: string;
  bookingSessionId: string;
  guests: GuestCounts;
  customer: BookingCustomer;
  cruise: BookingCruiseContext;
  confirmationAcknowledged: boolean;
  clientDisplayedTotalCents?: number;
};

export const BOOKING_ANALYTICS_EVENTS = [
  "product_view",
  "booking_started",
  "cruise_selected",
  "guests_selected",
  "details_completed",
  "checkout_started",
  "stripe_checkout_created",
  "booking_request_submitted",
  "payment_succeeded",
  "supplier_confirmed",
  "supplier_declined",
  "refund_initiated",
  "refund_completed",
] as const;

export const PLANNER_ANALYTICS_EVENTS = [
  "planner_completed",
  "planner_product_recommended",
  "planner_product_clicked",
  "planner_booking_started",
] as const;

export type BookingAnalyticsEvent = (typeof BOOKING_ANALYTICS_EVENTS)[number];
export type PlannerAnalyticsEvent = (typeof PLANNER_ANALYTICS_EVENTS)[number];
export type W2AnalyticsEvent = BookingAnalyticsEvent | PlannerAnalyticsEvent;
