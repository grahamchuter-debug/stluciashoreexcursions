/**
 * Public commercial status for St Lucia Shore Excursions (Phase 12D).
 * INTERNAL supply refs must never be rendered on customer pages.
 *
 * Gate values:
 * - PRODUCTION_READY_LOCKED — journey visible; live Pay & request disabled
 * - BOOKING_ENABLED — live checkout allowed (requires Worker LIVE unlock too)
 */
window.SL_COMMERCIAL = {
  bookingsApiUrl: "https://st-lucia-bookings-prod.dark-violet-8d91.workers.dev",
  email: "hello@stluciashoreexcursions.com",
  siteName: "St Lucia Shore Excursions",
  /** Phase 12D — infrastructure built; production payments remain locked. */
  defaultPublicBookingStatus: "PRODUCTION_READY_LOCKED",
  cancellation:
    "Free cancellation up to 14 days before your excursion. Cancellations made within 14 days of departure are non-refundable. If we are unable to confirm your excursion after payment, you will receive a full refund to your original payment method.",
  paymentNotConfirmation:
    "After payment, we'll arrange your excursion and send your confirmation as soon as it is confirmed. Payment does not mean the excursion is confirmed yet.",
  unableToConfirm:
    "If we are unable to confirm your excursion after payment, you will receive a full refund to your original payment method.",
  meetingInstructions:
    "Meeting instructions will be provided with your confirmed excursion details.",
  childInfantGuidance:
    "Child and infant places cannot be booked online for this excursion. Email hello@stluciashoreexcursions.com before requesting.",
  products: {
    "soufriere-volcano-waterfalls-tour": {
      productId: "soufriere-volcano-waterfalls-tour",
      slug: "soufriere-volcano-waterfalls-tour",
      name: "Soufrière Volcano & Waterfalls Tour",
      shortTitle: "Soufrière Volcano & Waterfalls",
      productPath: "/soufriere-shore-excursions.html",
      bookingPath: "/book/soufriere-volcano-waterfalls-tour/",
      receivedPath: "/book/soufriere-volcano-waterfalls-tour/received/",
      adultUsd: 152,
      childUsd: null,
      infantUsd: null,
      guestModel: "adult_only",
      durationLabel: "About 6 hours 30 minutes",
      maxGuests: 10,
      publicBookingStatus: "PRODUCTION_READY_LOCKED",
      displayPrice: "Adults $152 · Child/infant not sold online",
    },
    "st-lucia-catamaran-cruise": {
      productId: "st-lucia-catamaran-cruise",
      slug: "st-lucia-catamaran-cruise",
      name: "St Lucia Catamaran Cruise to Soufrière",
      shortTitle: "Catamaran Cruise to Soufrière",
      productPath: "/st-lucia-catamaran-cruises.html",
      bookingPath: "/book/st-lucia-catamaran-cruise/",
      receivedPath: "/book/st-lucia-catamaran-cruise/received/",
      adultUsd: 149,
      childUsd: null,
      infantUsd: 0,
      guestModel: "ages4_plus_infant",
      durationLabel: "About 7 hours",
      maxGuests: 10,
      publicBookingStatus: "PRODUCTION_READY_LOCKED",
      displayPrice: "Ages 4+ $149 · Infants (0–3) $0",
    },
    "pitons-views-tour": {
      productId: "pitons-views-tour",
      slug: "pitons-views-tour",
      name: "Pitons Views Tour",
      shortTitle: "Pitons Views Tour",
      productPath: "/pitons-volcano-tours.html",
      bookingPath: "/book/pitons-views-tour/",
      receivedPath: "/book/pitons-views-tour/received/",
      adultUsd: 81,
      childUsd: null,
      infantUsd: null,
      guestModel: "adult_only",
      durationLabel: "About 4 hours 30 minutes",
      maxGuests: 10,
      publicBookingStatus: "PRODUCTION_READY_LOCKED",
      displayPrice: "Adults $81 · Child/infant not sold online",
    },
  },
};
