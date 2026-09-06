/**
 * Shared booking engine tests — St Lucia Phase 12D (three RTB products).
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { findStLuciaBookingProduct, ST_LUCIA_BOOKING_PRODUCTS, ST_LUCIA_CANCELLATION_COPY } from "../destinations/st-lucia-products";
import { stLuciaBookingCore } from "../destinations/st-lucia";
import {
  assertClientTotalMatches,
  calculateBookingQuote,
  createBookingReference,
  destinationBrandFromCore,
  requestedCustomerEmail,
  statusAfterPaymentSuccess,
  supplierRequestEmail,
  validateCruise,
  validateCustomer,
} from "./index";

const brand = destinationBrandFromCore(stLuciaBookingCore);
const soufriere = findStLuciaBookingProduct("soufriere-volcano-waterfalls-tour");
const catamaran = findStLuciaBookingProduct("st-lucia-catamaran-cruise");
const pitons = findStLuciaBookingProduct("pitons-views-tour");
assert.ok(soufriere);
assert.ok(catamaran);
assert.ok(pitons);

test("three St Lucia product IDs present", () => {
  assert.equal(ST_LUCIA_BOOKING_PRODUCTS.length, 3);
  assert.deepEqual(
    ST_LUCIA_BOOKING_PRODUCTS.map((p) => p.id).sort(),
    ["pitons-views-tour", "soufriere-volcano-waterfalls-tour", "st-lucia-catamaran-cruise"].sort(),
  );
});

test("Soufrière adult-only USD 152; child/infant not sold", () => {
  assert.equal(soufriere!.pricing.adultAmount, 152);
  assert.equal(soufriere!.pricing.childPricingStatus, "not_sold");
  assert.equal(soufriere!.pricing.infantPricingStatus, "not_sold");
  assert.equal(calculateBookingQuote(soufriere!, { adults: 1, children: 0, infants: 0 }).amountCents, 15200);
  assert.equal(calculateBookingQuote(soufriere!, { adults: 2, children: 0, infants: 0 }).amountCents, 30400);
  assert.throws(() => calculateBookingQuote(soufriere!, { adults: 1, children: 1, infants: 0 }));
  assert.throws(() => calculateBookingQuote(soufriere!, { adults: 1, children: 0, infants: 1 }));
});

test("Catamaran ages 4+ USD 149; infant free; child band not sold", () => {
  assert.equal(catamaran!.pricing.adultAmount, 149);
  assert.equal(catamaran!.pricing.infantAmount, 0);
  assert.equal(catamaran!.pricing.infantPricingStatus, "priced");
  assert.equal(catamaran!.pricing.childPricingStatus, "not_sold");
  assert.equal(calculateBookingQuote(catamaran!, { adults: 1, children: 0, infants: 0 }).amountCents, 14900);
  assert.equal(calculateBookingQuote(catamaran!, { adults: 2, children: 0, infants: 1 }).amountCents, 29800);
  assert.throws(() => calculateBookingQuote(catamaran!, { adults: 1, children: 1, infants: 0 }));
});

test("Pitons Views adult-only USD 81; child/infant not sold", () => {
  assert.equal(pitons!.pricing.adultAmount, 81);
  assert.equal(calculateBookingQuote(pitons!, { adults: 1, children: 0, infants: 0 }).amountCents, 8100);
  assert.equal(calculateBookingQuote(pitons!, { adults: 3, children: 0, infants: 0 }).amountCents, 24300);
  assert.throws(() => calculateBookingQuote(pitons!, { adults: 1, children: 0, infants: 1 }));
});

test("max 10 guests; min 1 adult / paying; zero adults rejected", () => {
  for (const product of [soufriere!, catamaran!, pitons!]) {
    assert.equal(product.capacity.maxGuestsPerBooking, 10);
    assert.doesNotThrow(() => calculateBookingQuote(product, { adults: 10, children: 0, infants: 0 }));
    assert.throws(() => calculateBookingQuote(product, { adults: 11, children: 0, infants: 0 }));
    assert.throws(() => calculateBookingQuote(product, { adults: 0, children: 0, infants: 0 }));
    assert.throws(() => calculateBookingQuote(product, { adults: 0, children: 0, infants: 1 }));
  }
  assert.doesNotThrow(() => calculateBookingQuote(catamaran!, { adults: 9, children: 0, infants: 1 }));
  assert.throws(() => calculateBookingQuote(catamaran!, { adults: 10, children: 0, infants: 1 }));
});

test("client total must match server quote", () => {
  const quote = calculateBookingQuote(soufriere!, { adults: 2, children: 0, infants: 0 });
  assert.doesNotThrow(() => assertClientTotalMatches(quote, 30400));
  assert.throws(() => assertClientTotalMatches(quote, 1));
});

test("payment success status is requested not confirmed", () => {
  assert.equal(statusAfterPaymentSuccess("request"), "requested");
});

test("booking references use St Lucia W2SLE prefix (collision-safe)", () => {
  assert.match(createBookingReference(stLuciaBookingCore), /^W2SLE-/);
  assert.equal(stLuciaBookingCore.bookingRefPrefix, "W2SLE");
});

test("customer and cruise validation", () => {
  assert.equal(
    validateCustomer({ name: "Alex Traveller", email: "alex@example.com", phone: "+447700900123" }),
    null,
  );
  assert.ok(validateCustomer({ name: "A", email: "x", phone: "1" }));
  assert.ok(validateCustomer({ name: "Alex Traveller", email: "bad", phone: "+447700900123" }));
  assert.ok(
    validateCruise({
      date: "nope",
      shipName: "Ship",
      shipSlug: "s",
      cruiseLine: "",
      isCustomShip: true,
      scheduleMatched: false,
    }),
  );
  assert.equal(
    validateCruise({
      date: "2026-12-15",
      shipName: "Celebrity Beyond",
      shipSlug: "celebrity-beyond",
      cruiseLine: "Celebrity",
      isCustomShip: true,
      scheduleMatched: false,
    }),
    null,
  );
});

test("14-day cancellation copy", () => {
  assert.match(ST_LUCIA_CANCELLATION_COPY.customerCancellation, /14 days/);
  assert.doesNotMatch(ST_LUCIA_CANCELLATION_COPY.customerCancellation, /7 days/);
  assert.match(ST_LUCIA_CANCELLATION_COPY.unableToConfirm, /full refund/i);
});

test("request receipt email is truthful (payment ≠ confirmed); no public SEG leak", () => {
  const mail = requestedCustomerEmail({
    reference: "W2SLE-TESTTEST",
    product: soufriere!,
    cruise: {
      date: "2026-12-15",
      shipName: "Celebrity Beyond",
      shipSlug: "celebrity-beyond",
      cruiseLine: "Celebrity",
      isCustomShip: true,
      scheduleMatched: false,
    },
    guests: { adults: 2, children: 0, infants: 0 },
    amountLabel: "$304",
    customerName: "Alex Traveller",
    brand,
  });
  assert.match(mail.subject, /received|request/i);
  assert.doesNotMatch(mail.shell.introParagraphs.join("\n"), /confirmed your excursion/i);
  const blob = mail.subject + mail.bodyLines.join("\n") + mail.shell.introParagraphs.join("\n");
  assert.doesNotMatch(blob, /\bSEG\b|CASLJUNSOUVAN|CASLSAIL|CASLPITON|Shore Excursions Group/i);
});

test("ops email includes INTERNAL supply refs", () => {
  const email = supplierRequestEmail({
    reference: "W2SLE-TESTTEST",
    product: soufriere!,
    cruise: {
      date: "2026-12-15",
      shipName: "Celebrity Beyond",
      shipSlug: "celebrity-beyond",
      cruiseLine: "Celebrity",
      isCustomShip: true,
      scheduleMatched: false,
    },
    guests: { adults: 2, children: 0, infants: 0 },
    customer: { name: "Alex", email: "a@example.com", phone: "+447700900123" },
    amountLabel: "$304",
    destinationLabel: "St Lucia Shore Excursions — new booking request",
  });
  assert.match(email.body, /CASLJUNSOUVAN|INTERNAL supply/i);
  assert.match(email.body, /SEG affiliate|manual/i);
  assert.match(email.shell.destinationLabel, /St Lucia/i);
});
