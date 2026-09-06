import type { DestinationBookingCore } from "./types";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomStamp(length = 8): string {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** Network-wide format: PREFIX-XXXXXXXX from destination config. */
export function createBookingReference(core: Pick<DestinationBookingCore, "bookingRefPrefix">): string {
  return `${core.bookingRefPrefix}-${randomStamp(8)}`;
}

export function createBookingSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sess-${Date.now().toString(36)}-${randomStamp(6)}`;
}

export function bookingSessionStorageKey(
  core: Pick<DestinationBookingCore, "sessionKeyPrefix" | "sessionKeyVersion">,
  productId: string,
): string {
  return `${core.sessionKeyPrefix}:v${core.sessionKeyVersion}:${productId}`;
}

/** Deterministic Stripe/checkout idempotency material. */
export function checkoutIdempotencyMaterial(input: {
  productId: string;
  date: string;
  shipSlug: string;
  adults: number;
  children: number;
  infants: number;
  email: string;
  bookingSessionId: string;
}): string {
  const guestCount = input.adults + input.children + input.infants;
  return [
    input.productId,
    input.date,
    input.shipSlug,
    String(guestCount),
    String(input.adults),
    String(input.children),
    String(input.infants),
    input.email.trim().toLowerCase(),
    input.bookingSessionId,
  ].join("|");
}

export function createIdempotencyKey(material: string): string {
  let hash = 2166136261;
  for (let i = 0; i < material.length; i += 1) {
    hash ^= material.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, "0");
  return `checkout:${hex}${material.length.toString(16)}`;
}
