import type { BookingLifecycleStatus, BookingPaymentStatus } from "../../../shared/world-booking/types";

export type BookingRow = {
  id: string;
  booking_reference: string;
  booking_session_id: string;
  destination_id: string;
  product_id: string;
  product_name: string;
  cruise_date: string;
  ship_name: string;
  ship_slug: string | null;
  guest_count: number;
  adults: number;
  children: number;
  infants: number;
  unit_amount_cents: number;
  amount_total_cents: number;
  currency: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  operational_notes: string | null;
  status: BookingLifecycleStatus;
  payment_status: BookingPaymentStatus;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_refund_id: string | null;
  idempotency_key: string;
  payload_json: string;
  created_at: string;
  updated_at: string;
};

type DbEnv = { DB: D1Database };

export async function insertBooking(env: DbEnv, row: BookingRow): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO bookings (
      id, booking_reference, booking_session_id, destination_id, product_id, product_name,
      cruise_date, ship_name, ship_slug, guest_count, adults, children, infants,
      unit_amount_cents, amount_total_cents, currency, customer_name, customer_email,
      customer_phone, operational_notes, status, payment_status, stripe_checkout_session_id,
      stripe_payment_intent_id, stripe_refund_id, idempotency_key, payload_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      row.id,
      row.booking_reference,
      row.booking_session_id,
      row.destination_id,
      row.product_id,
      row.product_name,
      row.cruise_date,
      row.ship_name,
      row.ship_slug,
      row.guest_count,
      row.adults,
      row.children,
      row.infants,
      row.unit_amount_cents,
      row.amount_total_cents,
      row.currency,
      row.customer_name,
      row.customer_email,
      row.customer_phone,
      row.operational_notes,
      row.status,
      row.payment_status,
      row.stripe_checkout_session_id,
      row.stripe_payment_intent_id,
      row.stripe_refund_id,
      row.idempotency_key,
      row.payload_json,
      row.created_at,
      row.updated_at,
    )
    .run();
}

export async function getBookingByIdempotencyKey(env: DbEnv, key: string): Promise<BookingRow | null> {
  return (
    (await env.DB.prepare(`SELECT * FROM bookings WHERE idempotency_key = ? LIMIT 1`)
      .bind(key)
      .first<BookingRow>()) ?? null
  );
}

export async function getBookingByReference(env: DbEnv, reference: string): Promise<BookingRow | null> {
  return (
    (await env.DB.prepare(`SELECT * FROM bookings WHERE booking_reference = ? LIMIT 1`)
      .bind(reference)
      .first<BookingRow>()) ?? null
  );
}

export async function getBookingByCheckoutSessionId(env: DbEnv, sessionId: string): Promise<BookingRow | null> {
  return (
    (await env.DB.prepare(`SELECT * FROM bookings WHERE stripe_checkout_session_id = ? LIMIT 1`)
      .bind(sessionId)
      .first<BookingRow>()) ?? null
  );
}

export async function getBookingByPaymentIntentId(env: DbEnv, paymentIntentId: string): Promise<BookingRow | null> {
  return (
    (await env.DB.prepare(`SELECT * FROM bookings WHERE stripe_payment_intent_id = ? LIMIT 1`)
      .bind(paymentIntentId)
      .first<BookingRow>()) ?? null
  );
}

export async function getBookingBySessionId(env: DbEnv, bookingSessionId: string): Promise<BookingRow | null> {
  return (
    (await env.DB.prepare(`SELECT * FROM bookings WHERE booking_session_id = ? ORDER BY created_at DESC LIMIT 1`)
      .bind(bookingSessionId)
      .first<BookingRow>()) ?? null
  );
}

export async function updateBookingStripeIds(
  env: DbEnv,
  bookingReference: string,
  sessionId: string,
  paymentIntentId: string | null,
): Promise<void> {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE bookings
     SET stripe_checkout_session_id = ?,
         stripe_payment_intent_id = COALESCE(?, stripe_payment_intent_id),
         updated_at = ?
     WHERE booking_reference = ?`,
  )
    .bind(sessionId, paymentIntentId, now, bookingReference)
    .run();
}

export async function markCheckoutCreateFailed(env: DbEnv, bookingReference: string): Promise<void> {
  const now = new Date().toISOString();
  const abandonedKey = `abandoned:${crypto.randomUUID()}`;
  await env.DB.prepare(
    `UPDATE bookings
     SET status = 'payment_failed',
         payment_status = 'failed',
         idempotency_key = ?,
         updated_at = ?
     WHERE booking_reference = ?`,
  )
    .bind(abandonedKey, now, bookingReference)
    .run();
}

export async function updateBookingState(
  env: DbEnv,
  bookingReference: string,
  patch: {
    status?: BookingLifecycleStatus;
    payment_status?: BookingPaymentStatus;
    stripe_payment_intent_id?: string | null;
    stripe_refund_id?: string | null;
    customer_phone?: string | null;
    customer_email?: string | null;
    customer_name?: string | null;
  },
): Promise<void> {
  const current = await getBookingByReference(env, bookingReference);
  if (!current) return;
  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE bookings
     SET status = ?,
         payment_status = ?,
         stripe_payment_intent_id = COALESCE(?, stripe_payment_intent_id),
         stripe_refund_id = COALESCE(?, stripe_refund_id),
         customer_phone = COALESCE(?, customer_phone),
         customer_email = COALESCE(?, customer_email),
         customer_name = COALESCE(?, customer_name),
         updated_at = ?
     WHERE booking_reference = ?`,
  )
    .bind(
      patch.status ?? current.status,
      patch.payment_status ?? current.payment_status,
      patch.stripe_payment_intent_id ?? null,
      patch.stripe_refund_id ?? null,
      patch.customer_phone ?? null,
      patch.customer_email ?? null,
      patch.customer_name ?? null,
      now,
      bookingReference,
    )
    .run();
}

export async function eventAlreadyProcessed(env: DbEnv, eventId: string): Promise<boolean> {
  const row = await env.DB.prepare(`SELECT event_id FROM processed_events WHERE event_id = ? LIMIT 1`)
    .bind(eventId)
    .first<{ event_id: string }>();
  return Boolean(row);
}

export async function claimEvent(
  env: DbEnv,
  eventId: string,
  eventType: string,
  bookingReference: string | null,
): Promise<boolean> {
  const now = new Date().toISOString();
  try {
    await env.DB.prepare(
      `INSERT INTO processed_events (event_id, event_type, booking_reference, processed_at)
       VALUES (?, ?, ?, ?)`,
    )
      .bind(eventId, eventType, bookingReference, now)
      .run();
    return true;
  } catch {
    return false;
  }
}

export type EmailOutboxKind = "ops_request" | "customer_requested" | "customer_confirmed" | "customer_declined";

export type EmailOutboxRow = {
  id: string;
  booking_reference: string;
  kind: EmailOutboxKind;
  status: string;
  attempts: number;
  last_error: string | null;
  payload_json: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  last_attempted_at: string | null;
  provider_message_id: string | null;
};

/** Idempotent enqueue — unique (booking_reference, kind). Returns true if inserted. */
export async function enqueueEmailOutbox(
  env: DbEnv,
  args: { bookingReference: string; kind: EmailOutboxKind; payload: Record<string, unknown> },
): Promise<boolean> {
  const now = new Date().toISOString();
  try {
    await env.DB.prepare(
      `INSERT INTO email_outbox (
        id, booking_reference, kind, status, attempts, last_error, payload_json,
        created_at, updated_at, sent_at, last_attempted_at, provider_message_id
      ) VALUES (?, ?, ?, 'pending', 0, NULL, ?, ?, ?, NULL, NULL, NULL)`,
    )
      .bind(crypto.randomUUID(), args.bookingReference, args.kind, JSON.stringify(args.payload), now, now)
      .run();
    return true;
  } catch (err) {
    const message = String(err);
    if (/UNIQUE/i.test(message)) return false;
    throw err;
  }
}

export async function claimEmailOutboxForSend(env: DbEnv, outboxId: string): Promise<boolean> {
  const now = new Date().toISOString();
  const result = await env.DB.prepare(
    `UPDATE email_outbox
     SET status = 'processing',
         last_attempted_at = ?,
         updated_at = ?,
         attempts = attempts + 1,
         last_error = NULL
     WHERE id = ? AND status IN ('pending', 'failed')`,
  )
    .bind(now, now, outboxId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function getRetryableEmailOutbox(env: DbEnv, bookingReference: string | null): Promise<EmailOutboxRow[]> {
  if (bookingReference) {
    const result = await env.DB.prepare(
      `SELECT * FROM email_outbox
       WHERE booking_reference = ? AND status IN ('pending', 'failed')
       ORDER BY created_at ASC`,
    )
      .bind(bookingReference)
      .all<EmailOutboxRow>();
    return result.results ?? [];
  }
  const result = await env.DB.prepare(
    `SELECT * FROM email_outbox
     WHERE status IN ('pending', 'failed')
     ORDER BY created_at ASC
     LIMIT 50`,
  ).all<EmailOutboxRow>();
  return result.results ?? [];
}

export async function countEmailOutbox(env: DbEnv, bookingReference: string, kind?: EmailOutboxKind): Promise<number> {
  if (kind) {
    const row = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM email_outbox WHERE booking_reference = ? AND kind = ?`,
    )
      .bind(bookingReference, kind)
      .first<{ n: number }>();
    return Number(row?.n ?? 0);
  }
  const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM email_outbox WHERE booking_reference = ?`)
    .bind(bookingReference)
    .first<{ n: number }>();
  return Number(row?.n ?? 0);
}

export async function markEmailOutboxSent(env: DbEnv, outboxId: string, providerMessageId?: string | null): Promise<boolean> {
  const now = new Date().toISOString();
  const result = await env.DB.prepare(
    `UPDATE email_outbox
     SET status = 'sent',
         sent_at = ?,
         updated_at = ?,
         provider_message_id = COALESCE(?, provider_message_id),
         last_error = NULL
     WHERE id = ? AND status = 'processing'`,
  )
    .bind(now, now, providerMessageId ?? null, outboxId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function markEmailOutboxFailed(env: DbEnv, outboxId: string, error: string): Promise<void> {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE email_outbox
     SET status = 'failed',
         last_error = ?,
         updated_at = ?,
         last_attempted_at = COALESCE(last_attempted_at, ?)
     WHERE id = ? AND status IN ('processing', 'pending')`,
  )
    .bind(error.slice(0, 500), now, now, outboxId)
    .run();
}
