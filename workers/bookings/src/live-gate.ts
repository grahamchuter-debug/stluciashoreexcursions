import { supplierRoutingIsPlaceholder } from "../../../shared/world-booking";
import type { BookableProductConfig } from "../../../shared/world-booking/types";

/**
 * Live charging requires this code flag AND env.LIVE_PAYMENTS_UNLOCK.
 * A single environment variable must never enable live cards.
 */
/** Phase 12G: Graham-authorised live request-to-book unlock. */
export const LIVE_PAYMENTS_CODE_ENABLED = true;

export const LIVE_UNLOCK_PHRASE = "ST_LUCIA_LIVE_UNLOCK";

export type LiveBlock = {
  code: string;
  message: string;
};

export function bookingsAreEnabled(env: { BOOKINGS_ENABLED?: string }): boolean {
  return String(env.BOOKINGS_ENABLED ?? "true") !== "false";
}

export function liveReadinessGaps(
  env: {
    PAYMENTS_MODE?: string;
    LIVE_PAYMENTS_UNLOCK?: string;
    BOOKINGS_ENABLED?: string;
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    SITE_BASE_URL?: string;
    DB?: D1Database;
  },
  product: BookableProductConfig | null,
): string[] {
  const gaps: string[] = [];
  if (!LIVE_PAYMENTS_CODE_ENABLED) gaps.push("live_code_flag");
  if (String(env.PAYMENTS_MODE) !== "live") gaps.push("payments_mode");
  if (String(env.LIVE_PAYMENTS_UNLOCK ?? "") !== LIVE_UNLOCK_PHRASE) gaps.push("live_unlock_phrase");
  if (!bookingsAreEnabled(env)) gaps.push("bookings_disabled");
  if (!env.DB) gaps.push("d1_binding");
  const secret = typeof env.STRIPE_SECRET_KEY === "string" ? env.STRIPE_SECRET_KEY.trim() : "";
  if (!secret.startsWith("sk_live_")) gaps.push("stripe_live_secret");
  if (!env.STRIPE_WEBHOOK_SECRET?.trim()) gaps.push("webhook_secret");
  if (!(env.SITE_BASE_URL || "").includes("stluciashoreexcursions.com")) gaps.push("site_base_url");
  if (!product || supplierRoutingIsPlaceholder(product)) gaps.push("supplier_routing");
  return gaps;
}

export function liveCheckoutBlock(
  env: {
    PAYMENTS_MODE?: string;
    LIVE_PAYMENTS_UNLOCK?: string;
    BOOKINGS_ENABLED?: string;
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    SITE_BASE_URL?: string;
    DB?: D1Database;
  },
  product: BookableProductConfig | null,
): LiveBlock | null {
  if (!LIVE_PAYMENTS_CODE_ENABLED) {
    return {
      code: "LIVE_PAYMENTS_BLOCKED",
      message: "Live Stripe is not enabled for St Lucia. The live code flag is off. No payment was taken.",
    };
  }
  if (String(env.PAYMENTS_MODE) !== "live") {
    return {
      code: "LIVE_PAYMENTS_BLOCKED",
      message: "PAYMENTS_MODE is not live. No live payment was taken.",
    };
  }
  if (String(env.LIVE_PAYMENTS_UNLOCK ?? "") !== LIVE_UNLOCK_PHRASE) {
    return {
      code: "LIVE_UNLOCK_REQUIRED",
      message: "Live payments require the explicit LIVE_PAYMENTS_UNLOCK phrase. No payment was taken.",
    };
  }
  if (!bookingsAreEnabled(env)) {
    return {
      code: "BOOKINGS_DISABLED",
      message: "St Lucia online booking is switched off. No payment was taken.",
    };
  }
  if (!env.DB) {
    return {
      code: "D1_REQUIRED",
      message: "Production D1 is not bound. No payment was taken.",
    };
  }
  const secret = typeof env.STRIPE_SECRET_KEY === "string" ? env.STRIPE_SECRET_KEY.trim() : "";
  if (!secret.startsWith("sk_live_")) {
    return {
      code: "LIVE_SECRET_REQUIRED",
      message: "Live Checkout requires a Stripe live secret. No payment was taken.",
    };
  }
  if (!env.STRIPE_WEBHOOK_SECRET?.trim()) {
    return {
      code: "WEBHOOK_SECRET",
      message: "Live Checkout requires STRIPE_WEBHOOK_SECRET. No payment was taken.",
    };
  }
  const site = (env.SITE_BASE_URL || "").trim();
  if (!site.includes("stluciashoreexcursions.com")) {
    return {
      code: "SITE_BASE_URL",
      message: "Live Checkout requires SITE_BASE_URL on stluciashoreexcursions.com. No payment was taken.",
    };
  }
  if (!product) {
    return {
      code: "UNKNOWN_PRODUCT",
      message: "This excursion cannot be requested here.",
    };
  }
  if (supplierRoutingIsPlaceholder(product)) {
    return {
      code: "SUPPLIER_ROUTING",
      message:
        "Supplier notification is not production-ready. Live Checkout will not start until a real partner email is configured. No payment was taken.",
    };
  }
  return null;
}
