/**
 * St Lucia booking security / commercial gate tests (Phase 12D).
 * No live Stripe. Uses Worker preview mode + shared pricing authority.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import worker from "./index";
import { LIVE_PAYMENTS_CODE_ENABLED, liveCheckoutBlock, bookingsAreEnabled } from "./live-gate";
import { assertStripeTestSecret, StripeModeError } from "./stripe-guard";
import { findStLuciaBookingProduct, ST_LUCIA_BOOKING_PRODUCTS } from "../../../shared/destinations/st-lucia-products";
import {
  assertClientTotalMatches,
  calculateBookingQuote,
  statusAfterPaymentSuccess,
  validateCruise,
  validateCustomer,
} from "../../../shared/world-booking";

const previewEnv = {
  PAYMENTS_MODE: "preview",
  BOOKINGS_ENABLED: "true",
  CORS_ALLOWED_ORIGINS: "http://localhost:8913",
  SITE_BASE_URL: "http://localhost:8913",
} as unknown as Env;

function payload(
  sessionId: string,
  guests = { adults: 2, children: 0, infants: 0 },
  overrides: Record<string, unknown> = {},
  productId = "soufriere-volcano-waterfalls-tour",
) {
  const product = findStLuciaBookingProduct(productId)!;
  const quote = calculateBookingQuote(product, guests);
  return {
    productId,
    bookingSessionId: sessionId,
    guests,
    customer: { name: "Alex Traveller", email: "alex@example.com", phone: "+447700900123" },
    cruise: {
      date: "2026-12-15",
      shipName: "Celebrity Beyond",
      shipSlug: "celebrity-beyond",
      cruiseLine: "Celebrity Cruises",
      isCustomShip: true,
      scheduleMatched: false,
    },
    confirmationAcknowledged: true,
    clientDisplayedTotalCents: quote.amountCents,
    ...overrides,
  };
}

function jsonReq(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("LIVE_PAYMENTS_CODE_ENABLED is false for St Lucia Phase 12D (production locked)", () => {
  assert.equal(LIVE_PAYMENTS_CODE_ENABLED, false);
});

test("live checkout blocked by code flag even with unlock phrase", () => {
  const product = findStLuciaBookingProduct("soufriere-volcano-waterfalls-tour")!;
  const block = liveCheckoutBlock(
    {
      PAYMENTS_MODE: "live",
      LIVE_PAYMENTS_UNLOCK: "ST_LUCIA_LIVE_UNLOCK",
      BOOKINGS_ENABLED: "true",
      STRIPE_SECRET_KEY: "sk_live_fake",
      STRIPE_WEBHOOK_SECRET: "whsec_fake",
      SITE_BASE_URL: "https://stluciashoreexcursions.com",
      DB: {} as D1Database,
    },
    product,
  );
  assert.ok(block);
  assert.equal(block?.code, "LIVE_PAYMENTS_BLOCKED");
});

test("BOOKINGS_ENABLED=false kill switch", () => {
  assert.equal(bookingsAreEnabled({ BOOKINGS_ENABLED: "false" }), false);
});

test("all three products live request mode with USD currency", () => {
  for (const product of ST_LUCIA_BOOKING_PRODUCTS) {
    assert.equal(product.availability, "live");
    assert.equal(product.bookingMode, "request");
    assert.equal(product.pricing.currency, "USD");
    assert.equal(product.capacity.maxGuestsPerBooking, 10);
  }
});

test("Soufrière adult 15200 cents", () => {
  const product = findStLuciaBookingProduct("soufriere-volcano-waterfalls-tour")!;
  assert.equal(Math.round(product.pricing.adultAmount! * 100), 15200);
  assert.equal(calculateBookingQuote(product, { adults: 1, children: 0, infants: 0 }).amountCents, 15200);
});

test("Catamaran ages 4+ 14900; infant free", () => {
  const product = findStLuciaBookingProduct("st-lucia-catamaran-cruise")!;
  assert.equal(calculateBookingQuote(product, { adults: 1, children: 0, infants: 0 }).amountCents, 14900);
  assert.equal(calculateBookingQuote(product, { adults: 2, children: 0, infants: 2 }).amountCents, 29800);
});

test("Pitons Views adult 8100 cents", () => {
  const product = findStLuciaBookingProduct("pitons-views-tour")!;
  assert.equal(calculateBookingQuote(product, { adults: 1, children: 0, infants: 0 }).amountCents, 8100);
});

test("zero-adult booking rejected for all products", () => {
  for (const id of ["soufriere-volcano-waterfalls-tour", "st-lucia-catamaran-cruise", "pitons-views-tour"]) {
    const product = findStLuciaBookingProduct(id)!;
    assert.throws(() => calculateBookingQuote(product, { adults: 0, children: 0, infants: 0 }));
  }
});

test("max 10 guests ok; 11 guests rejected", () => {
  const product = findStLuciaBookingProduct("soufriere-volcano-waterfalls-tour")!;
  assert.doesNotThrow(() => calculateBookingQuote(product, { adults: 10, children: 0, infants: 0 }));
  assert.throws(() => calculateBookingQuote(product, { adults: 11, children: 0, infants: 0 }));
});

test("preview Worker records requested booking (payment ≠ confirmed)", async () => {
  const sessionId = `sl-sess-${Date.now()}`;
  const first = await worker.fetch(
    jsonReq("http://bookings.test/api/bookings/request", payload(sessionId, { adults: 2, children: 0, infants: 0 })),
    previewEnv,
  );
  const firstJson = (await first.json()) as { ok: boolean; status: string; reference: string };
  assert.equal(firstJson.ok, true);
  assert.equal(firstJson.status, "requested");
  assert.equal(statusAfterPaymentSuccess("request"), "requested");
  assert.match(firstJson.reference, /^W2SLE-/);
});

test("catamaran and pitons also requestable in preview", async () => {
  for (const productId of ["st-lucia-catamaran-cruise", "pitons-views-tour"] as const) {
    const guests =
      productId === "st-lucia-catamaran-cruise"
        ? { adults: 2, children: 0, infants: 1 }
        : { adults: 1, children: 0, infants: 0 };
    const res = await worker.fetch(
      jsonReq("http://bookings.test/api/bookings/request", payload(`sl-${productId}-${Date.now()}`, guests, {}, productId)),
      previewEnv,
    );
    const data = (await res.json()) as { ok: boolean; status: string };
    assert.equal(data.ok, true, productId);
    assert.equal(data.status, "requested", productId);
  }
});

test("client price tampering rejected", async () => {
  const tampered = payload(`tamper-${Date.now()}`, { adults: 2, children: 0, infants: 0 }, { clientDisplayedTotalCents: 1 });
  const response = await worker.fetch(jsonReq("http://bookings.test/api/bookings/request", tampered), previewEnv);
  const data = (await response.json()) as { ok: boolean; code: string };
  assert.equal(data.ok, false);
  assert.equal(data.code, "PRICE");
});

test("unknown product rejected", async () => {
  const bad = payload(`unk-${Date.now()}`, { adults: 1, children: 0, infants: 0 }, { productId: "not-a-st-lucia-product" });
  const response = await worker.fetch(jsonReq("http://bookings.test/api/bookings/request", bad), previewEnv);
  const data = (await response.json()) as { ok: boolean; code: string };
  assert.equal(data.ok, false);
  assert.equal(data.code, "UNKNOWN_PRODUCT");
});

test("missing consent rejected", async () => {
  const body = payload(`consent-${Date.now()}`, { adults: 1, children: 0, infants: 0 }, { confirmationAcknowledged: false });
  const response = await worker.fetch(jsonReq("http://bookings.test/api/bookings/request", body), previewEnv);
  const data = (await response.json()) as { ok: boolean; code: string };
  assert.equal(data.ok, false);
  assert.equal(data.code, "CONSENT");
});

test("invalid email / date / missing fields", () => {
  const product = findStLuciaBookingProduct("soufriere-volcano-waterfalls-tour")!;
  assert.throws(() => calculateBookingQuote(product, { adults: 0, children: 0, infants: 0 }));
  assert.ok(validateCruise({ date: "nope", shipName: "Ship", shipSlug: "s", cruiseLine: "", isCustomShip: true, scheduleMatched: false }));
  assert.ok(validateCustomer({ name: "Alex Traveller", email: "bad", phone: "+447700900123" }));
  assert.equal(validateCustomer({ name: "Alex Traveller", email: "alex@example.com", phone: "+447700900123" }), null);
});

test("missing customer fields rejected by preview Worker", async () => {
  const body = payload(`miss-${Date.now()}`, { adults: 1, children: 0, infants: 0 }, {
    customer: { name: "", email: "alex@example.com", phone: "+447700900123" },
  });
  const response = await worker.fetch(jsonReq("http://bookings.test/api/bookings/request", body), previewEnv);
  const data = (await response.json()) as { ok: boolean; code: string };
  assert.equal(data.ok, false);
  assert.equal(data.code, "CUSTOMER");
});

test("assertClientTotalMatches rejects mismatch", () => {
  const product = findStLuciaBookingProduct("soufriere-volcano-waterfalls-tour")!;
  const quote = calculateBookingQuote(product, { adults: 2, children: 0, infants: 0 });
  assert.throws(() => assertClientTotalMatches(quote, quote.amountCents - 100));
});

test("assertStripeTestSecret rejects live keys", () => {
  assert.equal(assertStripeTestSecret("sk_test_abc123"), "sk_test_abc123");
  assert.throws(
    () => assertStripeTestSecret("sk_live_abc123"),
    (error: unknown) => error instanceof StripeModeError && error.code === "LIVE_KEY_REJECTED",
  );
});

test("checkout kill switch returns BOOKINGS_DISABLED", async () => {
  const env = { ...previewEnv, PAYMENTS_MODE: "test", BOOKINGS_ENABLED: "false", STRIPE_SECRET_KEY: "sk_test_x" } as unknown as Env;
  const response = await worker.fetch(jsonReq("http://bookings.test/api/bookings/checkout", payload(`kill-${Date.now()}`)), env);
  const data = (await response.json()) as { ok: boolean; code: string };
  assert.equal(data.ok, false);
  assert.equal(data.code, "BOOKINGS_DISABLED");
});

test("bad webhook signature rejected (missing header)", async () => {
  const env = {
    PAYMENTS_MODE: "test",
    STRIPE_SECRET_KEY: "sk_test_abc",
    STRIPE_WEBHOOK_SECRET: "whsec_test",
    BOOKINGS_ENABLED: "true",
  } as unknown as Env;
  const response = await worker.fetch(
    new Request("http://bookings.test/api/stripe/webhook", { method: "POST", body: "{}" }),
    env,
  );
  const data = (await response.json()) as { ok: boolean; code: string };
  assert.equal(response.status, 400);
  assert.equal(data.code, "SIGNATURE");
});

test("bad webhook signature rejected (invalid signature)", async () => {
  const env = {
    PAYMENTS_MODE: "test",
    STRIPE_SECRET_KEY: "sk_test_abc",
    STRIPE_WEBHOOK_SECRET: "whsec_test",
    BOOKINGS_ENABLED: "true",
  } as unknown as Env;
  const response = await worker.fetch(
    new Request("http://bookings.test/api/stripe/webhook", {
      method: "POST",
      headers: { "Stripe-Signature": "t=1,v1=deadbeef" },
      body: '{"id":"evt_test"}',
    }),
    env,
  );
  const data = (await response.json()) as { ok: boolean; code: string };
  assert.equal(response.status, 400);
  assert.equal(data.code, "SIGNATURE");
});

test("TEST_ONLY_EMAIL_OVERRIDE applies only in PAYMENTS_MODE=test", async () => {
  const { resolveOutboundRecipient } = await import("./email");
  const intended = "synthetic.customer@example.com";
  const override = "info@wowatour.com";

  const inTest = resolveOutboundRecipient(
    { PAYMENTS_MODE: "test", TEST_ONLY_EMAIL_OVERRIDE: override },
    intended,
  );
  assert.equal(inTest.to, override);
  assert.equal(inTest.overridden, true);

  const inLive = resolveOutboundRecipient(
    { PAYMENTS_MODE: "live", TEST_ONLY_EMAIL_OVERRIDE: override },
    intended,
  );
  assert.equal(inLive.to, intended);
  assert.equal(inLive.overridden, false);

  const inPreview = resolveOutboundRecipient(
    { PAYMENTS_MODE: "preview", TEST_ONLY_EMAIL_OVERRIDE: override },
    intended,
  );
  assert.equal(inPreview.to, intended);
  assert.equal(inPreview.overridden, false);

  const noOverride = resolveOutboundRecipient({ PAYMENTS_MODE: "test" }, intended);
  assert.equal(noOverride.to, intended);
  assert.equal(noOverride.overridden, false);
});

test("Stripe Link disabled at St Lucia session level (checkout source)", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, "routes/checkout.ts"), "utf8");
  assert.match(src, /payment_method_types:\s*\[\s*["']card["']\s*\]/);
  assert.match(src, /wallet_options:\s*\{[\s\S]*link:\s*\{\s*display:\s*["']never["']/);
});

test("public HTML/JS leak scan — no SEG / internal codes in site assets", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
  const paths = [
    "js/commercial-config.js",
    "js/booking.js",
    "js/booking-received.js",
    "soufriere-shore-excursions.html",
    "st-lucia-catamaran-cruises.html",
    "pitons-volcano-tours.html",
    "private-st-lucia-tours.html",
  ];
  const banned = /\bSEG\b|Shore Excursions Group|CASLJUNSOUVAN|CASLSAIL|CASLPITON|SEG_MANUAL|shoreexcursionsgroup/i;
  for (const rel of paths) {
    const full = join(root, rel);
    try {
      const text = readFileSync(full, "utf8");
      assert.doesNotMatch(text, banned, rel);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw err;
    }
  }
});

test("internal product notes keep SEG_MANUAL codes off public paths", () => {
  for (const product of ST_LUCIA_BOOKING_PRODUCTS) {
    const notes = (product.supplierReferenceNotes || []).join("\n");
    assert.match(notes, /SEG_MANUAL/);
    assert.doesNotMatch(product.productPath, /SEG|CASL/i);
    assert.doesNotMatch(product.bookingPath, /SEG|CASL/i);
  }
});
