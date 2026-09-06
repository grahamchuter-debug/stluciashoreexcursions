export class StripeModeError extends Error {
  constructor(
    public readonly code: "LIVE_KEY_REJECTED" | "MISSING_TEST_KEY" | "TEST_KEY_REJECTED" | "MISSING_LIVE_KEY",
    message: string,
  ) {
    super(message);
    this.name = "StripeModeError";
  }
}

/**
 * Fail closed for TEST mode: only `sk_test_` keys are allowed.
 * `sk_live_` / `rk_live_` / anything else is rejected.
 */
export function assertStripeTestSecret(key: string | undefined | null): string {
  const value = typeof key === "string" ? key.trim() : "";
  if (value.startsWith("sk_live_") || value.startsWith("rk_live_")) {
    throw new StripeModeError(
      "LIVE_KEY_REJECTED",
      "A live Stripe secret was supplied. St Lucia TEST payments refuse live keys and will not create Checkout.",
    );
  }
  if (!value.startsWith("sk_test_")) {
    throw new StripeModeError(
      "MISSING_TEST_KEY",
      "STRIPE_SECRET_KEY must be a Stripe TEST secret starting with sk_test_.",
    );
  }
  return value;
}

/**
 * Fail closed for LIVE mode: only `sk_live_` keys are allowed.
 * TEST secrets must never create live Checkout.
 */
export function assertStripeLiveSecret(key: string | undefined | null): string {
  const value = typeof key === "string" ? key.trim() : "";
  if (value.startsWith("sk_test_") || value.startsWith("rk_test_")) {
    throw new StripeModeError(
      "TEST_KEY_REJECTED",
      "A TEST Stripe secret was supplied. St Lucia LIVE payments refuse TEST keys and will not create Checkout.",
    );
  }
  if (!value.startsWith("sk_live_")) {
    throw new StripeModeError(
      "MISSING_LIVE_KEY",
      "STRIPE_SECRET_KEY must be a Stripe LIVE secret starting with sk_live_.",
    );
  }
  return value;
}

export function isLiveStripeSecret(key: string | undefined | null): boolean {
  const value = typeof key === "string" ? key.trim() : "";
  return value.startsWith("sk_live_") || value.startsWith("rk_live_");
}
