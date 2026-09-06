/**
 * Phase 6I Stage B1 — refund path regression tests.
 * Mocks/stubs only. Never calls Stripe LIVE.
 */
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import type { BookingRow } from "./db";
import { countEmailOutbox, getBookingByReference, insertBooking } from "./db";
import { markRefundedFromCharge } from "./fulfill";
import { createMemoryD1 } from "./memory-d1";
import { declineBooking } from "./operator-actions";
import {
  createOperatorReviewToken,
  hashOperatorToken,
  type OperatorAuditRow,
} from "./operator-tokens";
import worker from "./index";
import { setStripeFactoryForTests } from "./stripe";
import type { EmailOutboxRow } from "./db";

afterEach(() => {
  setStripeFactoryForTests(null);
});

type RefundCall = {
  params: { payment_intent?: string; amount?: number; reason?: string };
  opts?: { idempotencyKey?: string };
};

function paidBooking(reference: string, overrides: Partial<BookingRow> = {}): BookingRow {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    booking_reference: reference,
    booking_session_id: `sess-${reference}`,
    destination_id: "st-lucia",
    product_id: "soufriere-volcano-waterfalls-tour",
    product_name: "Soufrière Volcano & Waterfalls Tour",
    cruise_date: "2026-09-11",
    ship_name: "MSC Seaside",
    ship_slug: "msc",
    guest_count: 1,
    adults: 1,
    children: 0,
    infants: 0,
    unit_amount_cents: 15200,
    amount_total_cents: 15200,
    currency: "usd",
    customer_name: "Graham Test",
    customer_email: "customer@example.com",
    customer_phone: "+447700900123",
    operational_notes: null,
    status: "requested",
    payment_status: "paid",
    stripe_checkout_session_id: null,
    stripe_payment_intent_id: `pi_test_${reference}`,
    stripe_refund_id: null,
    idempotency_key: `idem-${reference}`,
    payload_json: "{}",
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function baseEnv(db: D1Database, overrides: Record<string, unknown> = {}): Env {
  return {
    PAYMENTS_MODE: "test",
    BOOKINGS_ENABLED: "true",
    STRIPE_SECRET_KEY: "sk_test_refund_mock",
    STRIPE_WEBHOOK_SECRET: "whsec_test",
    EMAIL_SENDING_ENABLED: "true",
    EMAIL_FROM: "bookings@notifications.wowatour.com",
    EMAIL_FROM_NAME: "St Lucia Shore Excursions",
    EMAIL_REPLY_TO: "hello@stluciashoreexcursions.com",
    RESEND_API_KEY: "re_test_mock",
    SITE_BASE_URL: "http://localhost:4321",
    CORS_ALLOWED_ORIGINS: "http://localhost:4321",
    OPERATOR_TOKEN: "operator-header-secret",
    DB: db,
    ...overrides,
  } as unknown as Env;
}

function installStripeMock(args: {
  refundStatus?: string;
  refundAmount?: number;
  refundFail?: boolean;
  onCreate?: (call: RefundCall) => void;
}) {
  const calls: RefundCall[] = [];
  setStripeFactoryForTests(() => {
    return {
      refunds: {
        create: async (params: RefundCall["params"], opts?: RefundCall["opts"]) => {
          const call = { params, opts };
          calls.push(call);
          args.onCreate?.(call);
          if (args.refundFail) throw new Error("stripe_refund_mock_failed");
          return {
            id: `re_mock_${calls.length}`,
            status: args.refundStatus ?? "succeeded",
            amount: args.refundAmount ?? 15200,
          };
        },
      },
      checkout: {
        sessions: {
          retrieve: async () => ({
            payment_status: "paid",
            payment_intent: "pi_should_not_be_needed",
          }),
        },
      },
      webhooks: {
        constructEventAsync: async () => {
          throw new Error("not used in these tests");
        },
      },
    } as never;
  });
  return calls;
}

function installResendMock(mode: "success" | "fail") {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    if (url.includes("api.resend.com")) {
      if (mode === "fail") {
        return new Response(JSON.stringify({ message: "resend_mock_fail" }), { status: 500 });
      }
      return new Response(JSON.stringify({ id: "msg_mock_1" }), { status: 200 });
    }
    return original(input, init);
  }) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

async function listAudit(env: Env, reference: string): Promise<OperatorAuditRow[]> {
  const result = await env.DB.prepare(`SELECT * FROM operator_audit_log WHERE booking_reference = ?`)
    .bind(reference)
    .all<OperatorAuditRow>();
  return result.results ?? [];
}

async function listOutbox(env: Env, reference: string): Promise<EmailOutboxRow[]> {
  const result = await env.DB.prepare(`SELECT * FROM email_outbox WHERE booking_reference = ?`)
    .bind(reference)
    .all<EmailOutboxRow>();
  return result.results ?? [];
}

async function postDeclineAction(env: Env, reference: string, token: string, extra: Record<string, string> = {}) {
  const body = new URLSearchParams({
    ref: reference,
    t: token,
    action: "decline",
    confirmRefund: "yes",
    ...extra,
  });
  return worker.fetch(
    new Request("http://bookings.test/operator/review/action", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    }),
    env,
  );
}

test("refund A: successful full refund via tokenised operator path", async () => {
  const db = createMemoryD1();
  const env = baseEnv(db);
  const reference = "W2SLE-REFUND-A";
  await insertBooking(env, paidBooking(reference));
  const token = await createOperatorReviewToken(env, reference);
  const calls = installStripeMock({});
  const restoreFetch = installResendMock("success");
  try {
    const response = await postDeclineAction(env, reference, token);
    assert.equal(response.status, 200);
    const booking = await getBookingByReference(env, reference);
    assert.equal(booking?.payment_status, "refunded");
    assert.equal(booking?.status, "supplier_declined");
    assert.equal(booking?.stripe_refund_id, "re_mock_1");
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.params.payment_intent, `pi_test_${reference}`);
    assert.equal(calls[0]?.params.amount, undefined);
    assert.equal(calls[0]?.opts?.idempotencyKey, `refund:${reference}`);
    assert.equal(await countEmailOutbox(env, reference, "customer_declined"), 1);
    const outbox = await listOutbox(env, reference);
    assert.equal(outbox[0]?.status, "sent");
    const payload = JSON.parse(outbox[0]?.payload_json ?? "{}") as { text?: string; subject?: string };
    assert.match(payload.text ?? "", /couldn't confirm|could not confirm/i);
    assert.doesNotMatch(payload.text ?? "", /SEG|supplier declined|CASLJUNSOUVAN/i);
    assert.doesNotMatch(payload.text ?? "", /Controlled production test/i);
  } finally {
    restoreFetch();
  }
});

test("refund B: expired token — Stripe not called, no state change", async () => {
  const db = createMemoryD1();
  const env = baseEnv(db);
  const reference = "W2SLE-REFUND-B";
  await insertBooking(env, paidBooking(reference));
  const raw = "expired-token-value-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const tokenHash = await hashOperatorToken(raw);
  await env.DB.prepare(
    `INSERT INTO operator_action_tokens (id, booking_reference, token_hash, expires_at, consumed_at, created_at)
     VALUES (?, ?, ?, ?, NULL, ?)`,
  )
    .bind(crypto.randomUUID(), reference, tokenHash, new Date(Date.now() - 60_000).toISOString(), new Date().toISOString())
    .run();
  const calls = installStripeMock({});
  const response = await postDeclineAction(env, reference, raw);
  assert.equal(response.status, 403);
  assert.equal(calls.length, 0);
  const booking = await getBookingByReference(env, reference);
  assert.equal(booking?.payment_status, "paid");
  assert.equal(booking?.status, "requested");
  assert.equal(booking?.stripe_refund_id, null);
});

test("refund C: token for wrong booking — Stripe not called", async () => {
  const db = createMemoryD1();
  const env = baseEnv(db);
  const reference = "W2SLE-REFUND-C1";
  const other = "W2SLE-REFUND-C2";
  await insertBooking(env, paidBooking(reference));
  await insertBooking(env, paidBooking(other));
  const token = await createOperatorReviewToken(env, other);
  const calls = installStripeMock({});
  const response = await postDeclineAction(env, reference, token);
  assert.equal(response.status, 403);
  assert.equal(calls.length, 0);
  const booking = await getBookingByReference(env, reference);
  assert.equal(booking?.payment_status, "paid");
});

test("refund D: reused token — second action rejected, no second refund", async () => {
  const db = createMemoryD1();
  const env = baseEnv(db);
  const reference = "W2SLE-REFUND-D";
  await insertBooking(env, paidBooking(reference));
  const token = await createOperatorReviewToken(env, reference);
  const calls = installStripeMock({});
  const restoreFetch = installResendMock("success");
  try {
    const first = await postDeclineAction(env, reference, token);
    assert.equal(first.status, 200);
    assert.equal(calls.length, 1);
    const second = await postDeclineAction(env, reference, token);
    assert.equal(second.status, 403);
    assert.equal(calls.length, 1);
    assert.equal(await countEmailOutbox(env, reference, "customer_declined"), 1);
  } finally {
    restoreFetch();
  }
});

test("refund E: already refunded booking — Stripe not called again", async () => {
  const db = createMemoryD1();
  const env = baseEnv(db);
  const reference = "W2SLE-REFUND-E";
  await insertBooking(
    env,
    paidBooking(reference, {
      payment_status: "refunded",
      status: "supplier_declined",
      stripe_refund_id: "re_existing",
    }),
  );
  const calls = installStripeMock({});
  const result = await declineBooking(env, reference, { source: "token", tokenId: "tok-e" });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.duplicate, true);
  assert.equal(calls.length, 0);
  assert.equal(await countEmailOutbox(env, reference, "customer_declined"), 0);
});

test("refund F: Stripe refund failure — remains paid/requested, audit refund_failed", async () => {
  const db = createMemoryD1();
  const env = baseEnv(db);
  const reference = "W2SLE-REFUND-F";
  await insertBooking(env, paidBooking(reference));
  const token = await createOperatorReviewToken(env, reference);
  installStripeMock({ refundFail: true });
  const response = await postDeclineAction(env, reference, token);
  assert.equal(response.status, 502);
  const booking = await getBookingByReference(env, reference);
  assert.equal(booking?.payment_status, "paid");
  assert.equal(booking?.status, "requested");
  assert.equal(booking?.stripe_refund_id, null);
  const audit = await listAudit(env, reference);
  assert.ok(audit.some((row) => row.result === "refund_failed"));
  assert.equal(await countEmailOutbox(env, reference, "customer_declined"), 0);
});

test("refund G: Stripe success + email delivery failure — refund kept, outbox retryable", async () => {
  const db = createMemoryD1();
  const env = baseEnv(db);
  const reference = "W2SLE-REFUND-G";
  await insertBooking(env, paidBooking(reference));
  const token = await createOperatorReviewToken(env, reference);
  const calls = installStripeMock({});
  const restoreFetch = installResendMock("fail");
  try {
    const response = await postDeclineAction(env, reference, token);
    assert.equal(response.status, 200);
    assert.equal(calls.length, 1);
    const booking = await getBookingByReference(env, reference);
    assert.equal(booking?.payment_status, "refunded");
    assert.equal(booking?.status, "supplier_declined");
    assert.equal(booking?.stripe_refund_id, "re_mock_1");
    const outbox = await listOutbox(env, reference);
    assert.equal(outbox.length, 1);
    assert.equal(outbox[0]?.kind, "customer_declined");
    assert.equal(outbox[0]?.status, "failed");
  } finally {
    restoreFetch();
  }
});

test("refund H: duplicate charge.refunded webhook — state stable, no duplicate email", async () => {
  const db = createMemoryD1();
  const env = baseEnv(db);
  const reference = "W2SLE-REFUND-H";
  const pi = `pi_test_${reference}`;
  await insertBooking(env, paidBooking(reference));
  const token = await createOperatorReviewToken(env, reference);
  const calls = installStripeMock({});
  const restoreFetch = installResendMock("success");
  try {
    await postDeclineAction(env, reference, token);
    assert.equal(calls.length, 1);
    assert.equal(await countEmailOutbox(env, reference, "customer_declined"), 1);
    await markRefundedFromCharge(env, pi, true);
    await markRefundedFromCharge(env, pi, true);
    const booking = await getBookingByReference(env, reference);
    assert.equal(booking?.payment_status, "refunded");
    assert.equal(booking?.status, "supplier_declined");
    assert.equal(await countEmailOutbox(env, reference, "customer_declined"), 1);
    assert.equal(calls.length, 1);
  } finally {
    restoreFetch();
  }
});

test("refund I: client-supplied amount tampering ignored — server full refund only", async () => {
  const db = createMemoryD1();
  const env = baseEnv(db);
  const reference = "W2SLE-REFUND-I";
  await insertBooking(env, paidBooking(reference));
  const token = await createOperatorReviewToken(env, reference);
  const calls = installStripeMock({});
  const restoreFetch = installResendMock("success");
  try {
    const response = await postDeclineAction(env, reference, token, {
      amount: "1",
      amountCents: "1",
      refundAmount: "50",
    });
    assert.equal(response.status, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.params.amount, undefined);
    assert.equal(calls[0]?.params.payment_intent, `pi_test_${reference}`);
    const booking = await getBookingByReference(env, reference);
    assert.equal(booking?.amount_total_cents, 15200);
    assert.equal(booking?.payment_status, "refunded");
  } finally {
    restoreFetch();
  }
});

test("refund J: LIVE header decline without valid operator authorisation — forbidden", async () => {
  const db = createMemoryD1();
  const env = baseEnv(db, {
    PAYMENTS_MODE: "live",
    STRIPE_SECRET_KEY: "sk_live_refund_mock",
    OPERATOR_TOKEN: "operator-header-secret",
  });
  const reference = "W2SLE-REFUND-J";
  await insertBooking(env, paidBooking(reference));
  const calls = installStripeMock({});
  const response = await worker.fetch(
    new Request("http://bookings.test/api/bookings/operator/decline", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-St-Lucia-Operator-Token": "operator-header-secret",
      },
      body: JSON.stringify({ reference, amount: 1 }),
    }),
    env,
  );
  assert.equal(response.status, 403);
  const data = (await response.json()) as { code?: string };
  assert.equal(data.code, "OPERATOR_FORBIDDEN");
  assert.equal(calls.length, 0);
  const booking = await getBookingByReference(env, reference);
  assert.equal(booking?.payment_status, "paid");
  assert.equal(booking?.status, "requested");
});

test("refund live path: tokenised LIVE review allowed when LIVE_PAYMENTS_CODE_ENABLED is true", async () => {
  const db = createMemoryD1();
  const env = baseEnv(db, {
    PAYMENTS_MODE: "live",
    STRIPE_SECRET_KEY: "sk_live_refund_mock",
  });
  const reference = "W2SLE-REFUND-LIVE";
  await insertBooking(env, paidBooking(reference));
  const token = await createOperatorReviewToken(env, reference);
  const page = await worker.fetch(
    new Request(
      `http://bookings.test/operator/review?ref=${encodeURIComponent(reference)}&t=${encodeURIComponent(token)}&step=decline`,
    ),
    env,
  );
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /Decline|refund|Confirm/i);

  const calls = installStripeMock({});
  const restoreFetch = installResendMock("success");
  try {
    const action = await postDeclineAction(env, reference, token, {
      auditReason: "Phase 12G live tokenised decline path",
    });
    assert.equal(action.status, 200);
    assert.equal(calls.length, 1);
    const booking = await getBookingByReference(env, reference);
    assert.equal(booking?.status, "supplier_declined");
    assert.equal(booking?.payment_status, "refunded");
  } finally {
    restoreFetch();
  }
});


test("operator confirm via single-use token", async () => {
  const db = createMemoryD1();
  const env = baseEnv(db);
  const reference = "W2SLE-CONFIRM-A";
  await insertBooking(env, paidBooking(reference));
  const token = await createOperatorReviewToken(env, reference);
  const restoreFetch = installResendMock("success");
  try {
    const body = new URLSearchParams({ ref: reference, t: token, action: "confirm" });
    const response = await worker.fetch(
      new Request("http://bookings.test/operator/review/action", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      }),
      env,
    );
    assert.equal(response.status, 200);
    const booking = await getBookingByReference(env, reference);
    assert.equal(booking?.status, "confirmed");
    assert.equal(booking?.payment_status, "paid");
    assert.equal(await countEmailOutbox(env, reference, "customer_confirmed"), 1);

    const second = await worker.fetch(
      new Request("http://bookings.test/operator/review/action", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      }),
      env,
    );
    assert.equal(second.status, 403);
    assert.equal(await countEmailOutbox(env, reference, "customer_confirmed"), 1);
  } finally {
    restoreFetch();
  }
});

test("payment failure marks payment_failed not confirmed", async () => {
  const { markPaymentFailedFromIntent } = await import("./fulfill");
  const db = createMemoryD1();
  const env = baseEnv(db);
  const reference = "W2SLE-PAYFAIL-A";
  const now = new Date().toISOString();
  await insertBooking(
    env,
    paidBooking(reference, {
      status: "payment_pending",
      payment_status: "unpaid",
      stripe_payment_intent_id: "pi_fail_test",
      created_at: now,
      updated_at: now,
    }),
  );
  await markPaymentFailedFromIntent(env, { id: "pi_fail_test", metadata: { booking_ref: reference } } as never);
  const booking = await getBookingByReference(env, reference);
  assert.equal(booking?.status, "payment_failed");
  assert.equal(booking?.payment_status, "failed");
  assert.notEqual(booking?.status, "confirmed");
});

test("fulfillPaidBooking sets requested/paid idempotently (not confirmed)", async () => {
  const { fulfillPaidBooking } = await import("./fulfill");
  const db = createMemoryD1();
  const env = baseEnv(db);
  const reference = "W2SLE-PAID-A";
  await insertBooking(
    env,
    paidBooking(reference, {
      status: "payment_pending",
      payment_status: "unpaid",
    }),
  );
  const first = await fulfillPaidBooking(env, (await getBookingByReference(env, reference))!);
  assert.equal(first.status, "requested");
  assert.equal(first.payment_status, "paid");
  const second = await fulfillPaidBooking(env, first);
  assert.equal(second.status, "requested");
  assert.equal(second.payment_status, "paid");
  assert.notEqual(second.status, "confirmed");
});
