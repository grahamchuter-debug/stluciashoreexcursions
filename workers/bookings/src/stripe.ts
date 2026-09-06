import Stripe from "stripe";
import { assertStripeLiveSecret, assertStripeTestSecret } from "./stripe-guard";

export type StripeClient = Stripe;

type StripeFactory = (secret: string) => StripeClient;

let factoryOverride: StripeFactory | null = null;

/** Test-only injection. Never used in production paths. */
export function setStripeFactoryForTests(factory: StripeFactory | null): void {
  factoryOverride = factory;
}

/**
 * Selects the Stripe secret guard from PAYMENTS_MODE.
 * TEST refuses live keys; LIVE refuses TEST keys. Modes never interchange.
 */
export function createStripe(env: { STRIPE_SECRET_KEY?: string; PAYMENTS_MODE?: string }): StripeClient {
  const mode = String(env.PAYMENTS_MODE ?? "preview");
  const secret =
    mode === "live" ? assertStripeLiveSecret(env.STRIPE_SECRET_KEY) : assertStripeTestSecret(env.STRIPE_SECRET_KEY);
  if (factoryOverride) return factoryOverride(secret);
  return new Stripe(secret, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}
