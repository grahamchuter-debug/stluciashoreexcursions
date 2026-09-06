import { stLuciaBookingCore } from "./st-lucia";
import type { AgeBand, BookableProductConfig, ProductCapacity, ProductPricing } from "../world-booking/types";

/**
 * Operational routing: Wow A Tour ops mailbox for Graham’s manual fulfilment.
 * Public customers never see SEG. Graham places corresponding bookings via his
 * established SEG affiliate / white-label account using INTERNAL supply refs only.
 */
const OPERATIONS = {
  id: "wow-a-tour-operations",
  displayName: "Wow A Tour",
  notificationEmail: "info@wowatour.com",
  routingStatus: "production_ready" as const,
};

const REQUEST_SETTLEMENT = "charge_refund" as const;

/** Graham online max — never describe as supplier / vehicle / boat capacity. */
const ST_LUCIA_CAPACITY: ProductCapacity = {
  minGuests: 1,
  maxGuestsPerBooking: 10,
  maxGuestsPerBookingSource: "approved",
  supplierGroupSize: null,
  maxGuestsPerGuide: null,
};

/** Adult-only land tours — child/infant not sold online. */
const ADULT_ONLY_AGE_BANDS: readonly AgeBand[] = [
  { id: "adult", label: "Adults", minAge: null, maxAge: null, pricingStatus: "priced" },
  { id: "child", label: "Children", minAge: null, maxAge: null, pricingStatus: "not_sold" },
  { id: "infant", label: "Infants", minAge: 0, maxAge: 3, pricingStatus: "not_sold" },
];

/** Catamaran: Ages 4+ priced · Infants 0–3 free · under-18 with adult. */
const CATAMARAN_AGE_BANDS: readonly AgeBand[] = [
  { id: "adult", label: "Ages 4+", minAge: 4, maxAge: null, pricingStatus: "priced" },
  { id: "child", label: "Children (use Ages 4+)", minAge: null, maxAge: null, pricingStatus: "not_sold" },
  { id: "infant", label: "Infants (0–3)", minAge: 0, maxAge: 3, pricingStatus: "priced" },
];

function adultOnlyUsd(adultAmount: number): ProductPricing {
  return {
    model: "adult_child",
    currency: "USD",
    adultAmount,
    childAmount: null,
    childPricingStatus: "not_sold",
    infantAmount: null,
    infantPricingStatus: "not_sold",
    pricingNeedsConfirmation: false,
  };
}

function agesFourPlusWithFreeInfantUsd(amount: number): ProductPricing {
  return {
    model: "adult_child",
    currency: "USD",
    adultAmount: amount,
    childAmount: null,
    childPricingStatus: "not_sold",
    infantAmount: 0,
    infantPricingStatus: "priced",
    pricingNeedsConfirmation: false,
  };
}

const SHARED_PENDING = [
  "Customer cancellation APPROVED: free up to 14 days before excursion; within 14 days non-refundable.",
  "Unable to confirm after payment: full refund to original payment method.",
  "Meeting: Meeting instructions will be provided with your confirmed excursion details.",
  "Fulfilment: Graham places corresponding booking via established SEG affiliate / white-label route (INTERNAL).",
  "Payment received ≠ excursion confirmed.",
  "Online max 10 guests per booking (Graham online limit — not supplier capacity).",
  "LIVE_PAYMENTS_CODE_ENABLED remains false until Phase 12E+ Graham unlock.",
] as const;

export const ST_LUCIA_CANCELLATION_COPY = {
  customerCancellation:
    "Free cancellation up to 14 days before your excursion. Cancellations made within 14 days of departure are non-refundable. If we are unable to confirm your excursion after payment, you will receive a full refund to your original payment method.",
  freeWindow: "Free cancellation up to 14 days before your excursion.",
  insideWindow: "Cancellations made within 14 days of departure are non-refundable.",
  unableToConfirm:
    "If we are unable to confirm your excursion after payment, you will receive a full refund to your original payment method.",
  paymentNotConfirmation:
    "After payment, we'll arrange your excursion and send your confirmation as soon as it is confirmed. Payment does not mean the excursion is confirmed yet.",
  meetingInstructions:
    "Meeting instructions will be provided with your confirmed excursion details.",
  childInfantEmailGuidance:
    "Child and infant places cannot be booked online for this excursion. Email hello@stluciashoreexcursions.com before requesting.",
} as const;

const SOUFRIERE: BookableProductConfig = {
  id: "soufriere-volcano-waterfalls-tour",
  destinationId: stLuciaBookingCore.id,
  slug: "soufriere-volcano-waterfalls-tour",
  name: "Soufrière Volcano & Waterfalls Tour",
  durationLabel: "About 6 hours 30 minutes",
  bookingMode: "request",
  availability: "live",
  bookingPath: "/book/soufriere-volcano-waterfalls-tour",
  receivedPath: "/book/soufriere-volcano-waterfalls-tour/received",
  confirmedPath: "/book/soufriere-volcano-waterfalls-tour/received",
  productPath: "/soufriere-shore-excursions.html",
  pricing: adultOnlyUsd(152),
  ageBands: ADULT_ONLY_AGE_BANDS,
  capacity: ST_LUCIA_CAPACITY,
  requiredCustomerFields: ["name", "email", "phone"],
  supplier: OPERATIONS,
  paymentSettlement: REQUEST_SETTLEMENT,
  schedulePortSlug: "st-lucia",
  pendingCommercialRules: [
    ...SHARED_PENDING,
    "Adult USD 152 · Child/Infant NOT sold online → hello@stluciashoreexcursions.com",
    "Small-group land day · Moderate · Not wheelchair accessible",
    "Disclosures: uphill waterfall walk, steps/mixed surfaces, bumpy roads, no electric scooters, neck/back/hip caution",
    "Mud baths OPTIONAL ~USD $8 pp extra NOT included. No snorkelling. No full lunch.",
  ],
  supplierReferenceNotes: [
    "INTERNAL SUPPLY: SEG_MANUAL · CASLJUNSOUVAN",
    "INTERNAL CODE: CASLJUNSOUVAN",
    "Supplier contact: UNKNOWN · NOT_CONTACTED · net/margin UNKNOWN",
    "Fulfilment: place via established SEG affiliate / white-label route (manual — do not automate).",
    "Selling: Adult USD 152 · Child/Infant not sold online.",
    "Customer cancellation: Free cancellation up to 14 days before your excursion. Cancellations made within 14 days of departure are non-refundable.",
    "Unable to confirm after payment: full refund to original payment method.",
  ],
};

const CATAMARAN: BookableProductConfig = {
  id: "st-lucia-catamaran-cruise",
  destinationId: stLuciaBookingCore.id,
  slug: "st-lucia-catamaran-cruise",
  name: "St Lucia Catamaran Cruise to Soufrière",
  durationLabel: "About 7 hours",
  bookingMode: "request",
  availability: "live",
  bookingPath: "/book/st-lucia-catamaran-cruise",
  receivedPath: "/book/st-lucia-catamaran-cruise/received",
  confirmedPath: "/book/st-lucia-catamaran-cruise/received",
  productPath: "/st-lucia-catamaran-cruises.html",
  pricing: agesFourPlusWithFreeInfantUsd(149),
  ageBands: CATAMARAN_AGE_BANDS,
  capacity: ST_LUCIA_CAPACITY,
  requiredCustomerFields: ["name", "email", "phone"],
  supplier: OPERATIONS,
  paymentSettlement: REQUEST_SETTLEMENT,
  schedulePortSlug: "st-lucia",
  pendingCommercialRules: [
    ...SHARED_PENDING,
    "Ages 4+ USD 149 · Infant 0–3 USD 0 · min 1 paying / adult booking lead · under-18 with adult",
    "LARGE SHARED CATAMARAN — never call small / intimate / small boat",
    "Do NOT promise snorkel gear included. Do NOT position Rodney Bay as primary departure.",
  ],
  supplierReferenceNotes: [
    "INTERNAL SUPPLY: SEG_MANUAL · CASLSAIL",
    "INTERNAL CODE: CASLSAIL",
    "Supplier contact: UNKNOWN · NOT_CONTACTED · net/margin UNKNOWN",
    "Fulfilment: place via established SEG affiliate / white-label route (manual — do not automate).",
    "Selling: Ages 4+ USD 149 · Infants 0–3 USD 0.",
    "Customer cancellation: Free cancellation up to 14 days before your excursion. Cancellations made within 14 days of departure are non-refundable.",
    "Unable to confirm after payment: full refund to original payment method.",
  ],
};

const PITONS: BookableProductConfig = {
  id: "pitons-views-tour",
  destinationId: stLuciaBookingCore.id,
  slug: "pitons-views-tour",
  name: "Pitons Views Tour",
  durationLabel: "About 4 hours 30 minutes",
  bookingMode: "request",
  availability: "live",
  bookingPath: "/book/pitons-views-tour",
  receivedPath: "/book/pitons-views-tour/received",
  confirmedPath: "/book/pitons-views-tour/received",
  productPath: "/pitons-volcano-tours.html",
  pricing: adultOnlyUsd(81),
  ageBands: ADULT_ONLY_AGE_BANDS,
  capacity: ST_LUCIA_CAPACITY,
  requiredCustomerFields: ["name", "email", "phone"],
  supplier: OPERATIONS,
  paymentSettlement: REQUEST_SETTLEMENT,
  schedulePortSlug: "st-lucia",
  pendingCommercialRules: [
    ...SHARED_PENDING,
    "Adult USD 81 · Child/Infant NOT sold online → hello@stluciashoreexcursions.com",
    "Moderate · Not wheelchair accessible · must enter/exit transport",
    "NOT volcano/mud-bath — scenic views / Castries / Horizon View Point / Pitons viewpoint / Morne Fortune / Caribelle Batik",
  ],
  supplierReferenceNotes: [
    "INTERNAL SUPPLY: SEG_MANUAL · CASLPITON",
    "INTERNAL CODE: CASLPITON",
    "Supplier contact: UNKNOWN · NOT_CONTACTED · net/margin UNKNOWN",
    "Fulfilment: place via established SEG affiliate / white-label route (manual — do not automate).",
    "Selling: Adult USD 81 · Child/Infant not sold online.",
    "Customer cancellation: Free cancellation up to 14 days before your excursion. Cancellations made within 14 days of departure are non-refundable.",
    "Unable to confirm after payment: full refund to original payment method.",
  ],
};

export const ST_LUCIA_BOOKING_PRODUCTS: readonly BookableProductConfig[] = [SOUFRIERE, CATAMARAN, PITONS];

export function findStLuciaBookingProduct(productId: string): BookableProductConfig | undefined {
  return ST_LUCIA_BOOKING_PRODUCTS.find((p) => p.id === productId || p.slug === productId);
}
