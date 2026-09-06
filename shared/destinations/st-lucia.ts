/**
 * St Lucia destination booking core.
 * Product catalogue: shared/destinations/st-lucia-products.ts
 * Public editorial tours: equity .html pages via scripts/build-site.py
 * Internal supply mapping: product.supplierReferenceNotes (never public HTML)
 */
import type { DestinationBookingCore } from "../world-booking/types";

export const stLuciaBookingCore = {
  id: "st-lucia",
  siteName: "St Lucia Shore Excursions",
  siteHostname: "stluciashoreexcursions.com",
  siteUrl: "https://stluciashoreexcursions.com",
  bookingEmail: "hello@stluciashoreexcursions.com",
  originatingSite: "stluciashoreexcursions.com",
  originatingPort: "Castries, St Lucia",
  bookingRefPrefix: "W2SLE",
  sessionKeyPrefix: "w2-sl-booking",
  sessionKeyVersion: 1,
  currencyCode: "USD",
  bookableWindow: {
    start: "2026-09-01",
    end: "2028-12-31",
  },
  /** Family G / CT-2 schedule import deferred — cruise date/ship are customer-entered. */
  schedulePortSlug: "st-lucia",
  customShipSlug: "not-listed",
  contactPath: "/contact",
  termsPath: "/terms",
  privacyPath: "/privacy",
} as const satisfies DestinationBookingCore;
