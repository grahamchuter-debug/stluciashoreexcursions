import type { BookableProductConfig, BookingQuote, GuestCounts, QuoteLine } from "./types";

export class PricingError extends Error {
  constructor(
    public readonly code:
      | "CHILD_PRICE_NOT_CONFIGURED"
      | "INFANT_PRICE_NOT_CONFIGURED"
      | "INVALID_GUEST_COUNTS"
      | "GUEST_LIMIT"
      | "PRICING_MODEL_UNSUPPORTED"
      | "AMOUNT_MISMATCH"
      | "ADULT_REQUIRED",
    message: string,
  ) {
    super(message);
    this.name = "PricingError";
  }
}

export function partySize(guests: GuestCounts): number {
  return guests.adults + guests.children + guests.infants;
}

export function payingGuestCount(guests: GuestCounts): number {
  return guests.adults + guests.children;
}

export function emptyGuests(minAdults = 1): GuestCounts {
  return { adults: minAdults, children: 0, infants: 0 };
}

export function usesFlatGuestPricing(product: BookableProductConfig): boolean {
  return product.pricing.model === "flat_per_guest";
}

export function usesAgeBandGuestUi(product: BookableProductConfig): boolean {
  return product.pricing.model === "per_person" || product.pricing.model === "adult_child";
}

/** Authoritative per-guest selling price for flat_per_guest products. */
export function sellingPricePerGuest(product: BookableProductConfig): number {
  if (product.pricing.model === "flat_per_guest") {
    return product.pricing.pricePerGuest ?? product.pricing.adultAmount;
  }
  return product.pricing.adultAmount;
}

function bandLine(
  count: number,
  unitMajor: number | null,
  rateStatus: QuoteLine["rateStatus"],
): QuoteLine {
  const priced = rateStatus === "priced" && unitMajor != null;
  return {
    count,
    unitMajor,
    totalMajor: priced ? unitMajor * count : 0,
    rateStatus,
  };
}

export function validateGuestCounts(product: BookableProductConfig, guests: GuestCounts): void {
  if (
    !Number.isInteger(guests.adults) ||
    !Number.isInteger(guests.children) ||
    !Number.isInteger(guests.infants) ||
    guests.adults < 0 ||
    guests.children < 0 ||
    guests.infants < 0
  ) {
    throw new PricingError("INVALID_GUEST_COUNTS", "Guest counts must be whole numbers of zero or more.");
  }

  if (usesFlatGuestPricing(product)) {
    const total = partySize(guests);
    const { minGuests, maxGuestsPerBooking } = product.capacity;
    if (total < minGuests || total > maxGuestsPerBooking) {
      throw new PricingError(
        "GUEST_LIMIT",
        `This excursion can be requested for ${minGuests}–${maxGuestsPerBooking} guests.`,
      );
    }
    return;
  }

  if (guests.adults < 1) {
    throw new PricingError("ADULT_REQUIRED", "Please include at least one adult.");
  }

  if (guests.children > 0 && product.pricing.childPricingStatus === "not_sold") {
    throw new PricingError(
      "CHILD_PRICE_NOT_CONFIGURED",
      "Child tickets are not sold for this excursion yet.",
    );
  }

  if (guests.infants > 0 && product.pricing.infantPricingStatus === "not_sold") {
    throw new PricingError(
      "INFANT_PRICE_NOT_CONFIGURED",
      "Under-4 / infant places cannot be requested online. Email hello@ before booking if travelling with a child under 4.",
    );
  }

  if (guests.children > 0 && product.pricing.childPricingStatus === "priced" && product.pricing.childAmount == null) {
    throw new PricingError("CHILD_PRICE_NOT_CONFIGURED", "Child tickets are not configured for this excursion.");
  }

  if (guests.infants > 0 && product.pricing.infantPricingStatus === "priced" && product.pricing.infantAmount == null) {
    throw new PricingError("INFANT_PRICE_NOT_CONFIGURED", "Infant price is not configured.");
  }

  const total = partySize(guests);
  const { minGuests, maxGuestsPerBooking } = product.capacity;
  if (total < minGuests || total > maxGuestsPerBooking) {
    throw new PricingError(
      "GUEST_LIMIT",
      `This excursion can be requested for ${minGuests}–${maxGuestsPerBooking} guests.`,
    );
  }
}

/**
 * Authoritative quote. UI and Worker must both call this with the same
 * product configuration. Never accept a client-supplied total.
 *
 * `flat_per_guest`: every traveller pays `pricePerGuest`.
 * Age-band models still support adult / child / infant rates for other destinations.
 */
export function calculateBookingQuote(product: BookableProductConfig, guests: GuestCounts): BookingQuote {
  validateGuestCounts(product, guests);

  if (product.pricing.model === "flat_per_guest") {
    const unit = sellingPricePerGuest(product);
    const n = partySize(guests);
    const adults = bandLine(guests.adults, unit, "priced");
    const children = bandLine(guests.children, unit, guests.children > 0 ? "priced" : "not_sold");
    const infants = bandLine(guests.infants, unit, guests.infants > 0 ? "priced" : "not_sold");
    const amountMajor = unit * n;
    return {
      currency: product.pricing.currency,
      amountMajor,
      amountCents: Math.round(amountMajor * 100),
      payingGuestCount: n,
      partySize: n,
      pricingNeedsConfirmation: false,
      breakdown: { adults, children, infants },
    };
  }

  if (product.pricing.model !== "per_person" && product.pricing.model !== "adult_child") {
    throw new PricingError(
      "PRICING_MODEL_UNSUPPORTED",
      `Pricing model ${product.pricing.model} is not implemented yet.`,
    );
  }

  const adults = bandLine(guests.adults, product.pricing.adultAmount, "priced");
  const children = bandLine(
    guests.children,
    product.pricing.childAmount,
    product.pricing.childPricingStatus,
  );
  const infants = bandLine(
    guests.infants,
    product.pricing.infantPricingStatus === "priced" ? product.pricing.infantAmount : null,
    product.pricing.infantPricingStatus,
  );

  const amountMajor = adults.totalMajor + children.totalMajor + infants.totalMajor;
  const pricingNeedsConfirmation =
    product.pricing.pricingNeedsConfirmation ||
    (guests.children > 0 && children.rateStatus !== "priced") ||
    (guests.infants > 0 && infants.rateStatus !== "priced");

  return {
    currency: product.pricing.currency,
    amountMajor,
    amountCents: Math.round(amountMajor * 100),
    payingGuestCount: guests.adults + (children.rateStatus === "priced" ? guests.children : 0),
    partySize: partySize(guests),
    pricingNeedsConfirmation,
    breakdown: { adults, children, infants },
  };
}

export function assertClientTotalMatches(quote: BookingQuote, clientDisplayedTotalCents?: number): void {
  if (clientDisplayedTotalCents == null) return;
  if (clientDisplayedTotalCents !== quote.amountCents) {
    throw new PricingError(
      "AMOUNT_MISMATCH",
      "The displayed total does not match the authoritative price.",
    );
  }
}

export function supplierRoutingIsPlaceholder(product: BookableProductConfig): boolean {
  return product.supplier.routingStatus !== "production_ready" || !product.supplier.notificationEmail;
}

export function canSendSupplierEmail(
  product: BookableProductConfig,
  runtime: "off" | "preview" | "test" | "live",
): boolean {
  if (runtime !== "live") return false;
  if (supplierRoutingIsPlaceholder(product)) return false;
  return true;
}
