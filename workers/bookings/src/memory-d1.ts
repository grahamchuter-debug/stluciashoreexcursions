/**
 * Minimal in-memory D1 stand-in for Worker unit tests.
 * Not used in wrangler/local D1.
 */
import type { BookingRow, EmailOutboxRow } from "./db";
import type { OperatorActionTokenRow, OperatorAuditRow } from "./operator-tokens";

type EventRow = {
  event_id: string;
  event_type: string;
  booking_reference: string | null;
  processed_at: string;
};

type Bound = { sql: string; values: unknown[] };

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createMemoryD1(): D1Database {
  const bookings = new Map<string, BookingRow>();
  const events = new Map<string, EventRow>();
  const outbox = new Map<string, EmailOutboxRow>();
  const operatorTokens = new Map<string, OperatorActionTokenRow>();
  const operatorAudit = new Map<string, OperatorAuditRow>();

  function allBookings(): BookingRow[] {
    return [...bookings.values()];
  }

  const db = {
    prepare(sql: string) {
      const bound: Bound = { sql, values: [] };
      const stmt = {
        bind(...values: unknown[]) {
          bound.values = values;
          return stmt;
        },
        async first<T>() {
          return (runQuery(bound, "first") as T | null) ?? null;
        },
        async run() {
          const result = runQuery(bound, "run") as { changes?: number } | null;
          return { success: true, meta: { changes: result?.changes ?? 1 } };
        },
        async all<T>() {
          const result = runQuery(bound, "all");
          return { results: (result as T[]) ?? [], success: true };
        },
      };
      return stmt;
    },
  };

  function runQuery(bound: Bound, kind: "first" | "run" | "all"): unknown {
    const sql = bound.sql.replace(/\s+/g, " ").trim();
    const v = bound.values;

    if (sql.startsWith("INSERT INTO bookings")) {
      const row: BookingRow = {
        id: String(v[0]),
        booking_reference: String(v[1]),
        booking_session_id: String(v[2]),
        destination_id: String(v[3]),
        product_id: String(v[4]),
        product_name: String(v[5]),
        cruise_date: String(v[6]),
        ship_name: String(v[7]),
        ship_slug: (v[8] as string | null) ?? null,
        guest_count: Number(v[9]),
        adults: Number(v[10]),
        children: Number(v[11]),
        infants: Number(v[12]),
        unit_amount_cents: Number(v[13]),
        amount_total_cents: Number(v[14]),
        currency: String(v[15]),
        customer_name: String(v[16]),
        customer_email: String(v[17]),
        customer_phone: String(v[18]),
        operational_notes: (v[19] as string | null) ?? null,
        status: v[20] as BookingRow["status"],
        payment_status: v[21] as BookingRow["payment_status"],
        stripe_checkout_session_id: (v[22] as string | null) ?? null,
        stripe_payment_intent_id: (v[23] as string | null) ?? null,
        stripe_refund_id: (v[24] as string | null) ?? null,
        idempotency_key: String(v[25]),
        payload_json: String(v[26]),
        created_at: String(v[27]),
        updated_at: String(v[28]),
      };
      if ([...bookings.values()].some((item) => item.idempotency_key === row.idempotency_key)) {
        throw new Error("UNIQUE constraint failed: idempotency_key");
      }
      bookings.set(row.booking_reference, row);
      return null;
    }

    if (sql.includes("FROM bookings WHERE idempotency_key")) {
      const found = allBookings().find((item) => item.idempotency_key === v[0]);
      return found ? clone(found) : null;
    }
    if (sql.includes("FROM bookings WHERE booking_reference")) {
      const found = bookings.get(String(v[0]));
      return found ? clone(found) : null;
    }
    if (sql.includes("FROM bookings WHERE stripe_checkout_session_id")) {
      const found = allBookings().find((item) => item.stripe_checkout_session_id === v[0]);
      return found ? clone(found) : null;
    }
    if (sql.includes("FROM bookings WHERE stripe_payment_intent_id")) {
      const found = allBookings().find((item) => item.stripe_payment_intent_id === v[0]);
      return found ? clone(found) : null;
    }
    if (sql.includes("FROM bookings WHERE booking_session_id")) {
      const found = allBookings()
        .filter((item) => item.booking_session_id === v[0])
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      return found ? clone(found) : null;
    }

    if (sql.startsWith("UPDATE bookings") && sql.includes("stripe_checkout_session_id")) {
      const sessionId = String(v[0]);
      const paymentIntentId = v[1] as string | null;
      const now = String(v[2]);
      const ref = String(v[3]);
      const row = bookings.get(ref);
      if (row) {
        row.stripe_checkout_session_id = sessionId;
        if (paymentIntentId) row.stripe_payment_intent_id = paymentIntentId;
        row.updated_at = now;
      }
      return null;
    }

    if (sql.startsWith("UPDATE bookings") && sql.includes("idempotency_key = ?")) {
      const abandonedKey = String(v[0]);
      const now = String(v[1]);
      const ref = String(v[2]);
      const row = bookings.get(ref);
      if (row) {
        row.status = "payment_failed";
        row.payment_status = "failed";
        row.idempotency_key = abandonedKey;
        row.updated_at = now;
      }
      return null;
    }

    if (sql.startsWith("UPDATE bookings") && sql.includes("SET status = ?")) {
      const ref = String(v[8]);
      const row = bookings.get(ref);
      if (row) {
        row.status = v[0] as BookingRow["status"];
        row.payment_status = v[1] as BookingRow["payment_status"];
        if (v[2]) row.stripe_payment_intent_id = String(v[2]);
        if (v[3]) row.stripe_refund_id = String(v[3]);
        if (v[4]) row.customer_phone = String(v[4]);
        if (v[5]) row.customer_email = String(v[5]);
        if (v[6]) row.customer_name = String(v[6]);
        row.updated_at = String(v[7]);
      }
      return null;
    }

    if (sql.startsWith("INSERT INTO processed_events")) {
      const eventId = String(v[0]);
      if (events.has(eventId)) throw new Error("UNIQUE constraint failed: event_id");
      events.set(eventId, {
        event_id: eventId,
        event_type: String(v[1]),
        booking_reference: (v[2] as string | null) ?? null,
        processed_at: String(v[3]),
      });
      return null;
    }

    if (sql.includes("FROM processed_events WHERE event_id")) {
      const found = events.get(String(v[0]));
      return found ? { event_id: found.event_id } : null;
    }

    if (sql.startsWith("INSERT INTO email_outbox")) {
      const row: EmailOutboxRow = {
        id: String(v[0]),
        booking_reference: String(v[1]),
        kind: v[2] as EmailOutboxRow["kind"],
        status: "pending",
        attempts: 0,
        last_error: null,
        payload_json: String(v[3]),
        created_at: String(v[4]),
        updated_at: String(v[5]),
        sent_at: null,
        last_attempted_at: null,
        provider_message_id: null,
      };
      const duplicate = [...outbox.values()].some(
        (item) => item.booking_reference === row.booking_reference && item.kind === row.kind,
      );
      if (duplicate) throw new Error("UNIQUE constraint failed: email_outbox booking_reference+kind");
      outbox.set(row.id, row);
      return { changes: 1 };
    }

    if (sql.startsWith("UPDATE email_outbox") && sql.includes("status = 'sent'")) {
      const id = String(v[3]);
      const row = outbox.get(id);
      if (!row || row.status !== "processing") return { changes: 0 };
      row.status = "sent";
      row.sent_at = String(v[0]);
      row.updated_at = String(v[1]);
      if (v[2]) row.provider_message_id = String(v[2]);
      row.last_error = null;
      return { changes: 1 };
    }

    if (sql.startsWith("UPDATE email_outbox") && sql.includes("SET status = 'processing'")) {
      const id = String(v[2]);
      const row = outbox.get(id);
      if (!row || (row.status !== "pending" && row.status !== "failed")) return { changes: 0 };
      row.status = "processing";
      row.last_attempted_at = String(v[0]);
      row.updated_at = String(v[1]);
      row.attempts += 1;
      row.last_error = null;
      return { changes: 1 };
    }

    if (sql.startsWith("UPDATE email_outbox") && sql.includes("status = 'failed'")) {
      const id = String(v[3]);
      const row = outbox.get(id);
      if (!row || (row.status !== "processing" && row.status !== "pending")) return { changes: 0 };
      row.status = "failed";
      row.last_error = String(v[0]);
      row.updated_at = String(v[1]);
      row.last_attempted_at = row.last_attempted_at ?? String(v[2]);
      return { changes: 1 };
    }

    if (sql.includes("FROM email_outbox") && sql.includes("COUNT(*)")) {
      const ref = String(v[0]);
      const kind = v.length > 1 ? String(v[1]) : null;
      const n = [...outbox.values()].filter(
        (item) => item.booking_reference === ref && (!kind || item.kind === kind),
      ).length;
      return { n };
    }

    if (sql.includes("FROM email_outbox") && sql.includes("booking_reference = ?") && sql.includes("status IN")) {
      return [...outbox.values()]
        .filter((item) => item.booking_reference === String(v[0]) && (item.status === "pending" || item.status === "failed"))
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((item) => clone(item));
    }

    if (sql.includes("FROM email_outbox") && sql.includes("status IN")) {
      return [...outbox.values()]
        .filter((item) => item.status === "pending" || item.status === "failed")
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .slice(0, 50)
        .map((item) => clone(item));
    }

    if (sql.startsWith("INSERT INTO operator_action_tokens")) {
      const row: OperatorActionTokenRow = {
        id: String(v[0]),
        booking_reference: String(v[1]),
        token_hash: String(v[2]),
        expires_at: String(v[3]),
        consumed_at: null,
        created_at: String(v[4]),
      };
      if ([...operatorTokens.values()].some((item) => item.token_hash === row.token_hash)) {
        throw new Error("UNIQUE constraint failed: token_hash");
      }
      operatorTokens.set(row.id, row);
      return null;
    }

    if (sql.includes("FROM operator_action_tokens WHERE token_hash")) {
      const found = [...operatorTokens.values()].find((item) => item.token_hash === String(v[0]));
      return found ? clone(found) : null;
    }

    if (sql.startsWith("UPDATE operator_action_tokens") && sql.includes("consumed_at")) {
      const now = String(v[0]);
      const id = String(v[1]);
      const row = operatorTokens.get(id);
      if (row && !row.consumed_at) {
        row.consumed_at = now;
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    if (sql.startsWith("INSERT INTO operator_audit_log")) {
      const row: OperatorAuditRow = {
        id: String(v[0]),
        booking_reference: String(v[1]),
        action_type: String(v[2]),
        result: String(v[3]),
        source: String(v[4]),
        token_id: (v[5] as string | null) ?? null,
        detail: (v[6] as string | null) ?? null,
        created_at: String(v[7]),
      };
      operatorAudit.set(row.id, row);
      return null;
    }

    if (sql.includes("FROM operator_audit_log") && sql.includes("booking_reference")) {
      return [...operatorAudit.values()]
        .filter((item) => item.booking_reference === String(v[0]))
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((item) => clone(item));
    }

    if (
      sql.includes("FROM email_outbox") &&
      sql.includes("booking_reference = ?") &&
      !sql.includes("status IN") &&
      !sql.includes("COUNT(*)")
    ) {
      return [...outbox.values()]
        .filter((item) => item.booking_reference === String(v[0]))
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((item) => clone(item));
    }

    throw new Error(`Unhandled test SQL (${kind}): ${sql}`);
  }

  return db as unknown as D1Database;
}
