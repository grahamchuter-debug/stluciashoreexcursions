-- Barbados request-to-book persistence for Stripe TEST.
-- Never store card data. This schema is for preview/test only — not production Portofino/Villefranche.

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  booking_reference TEXT NOT NULL UNIQUE,
  booking_session_id TEXT NOT NULL,
  destination_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  cruise_date TEXT NOT NULL,
  ship_name TEXT NOT NULL,
  ship_slug TEXT,
  guest_count INTEGER NOT NULL,
  adults INTEGER NOT NULL DEFAULT 0,
  children INTEGER NOT NULL DEFAULT 0,
  infants INTEGER NOT NULL DEFAULT 0,
  unit_amount_cents INTEGER NOT NULL,
  amount_total_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  operational_notes TEXT,
  status TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_refund_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_session ON bookings(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_intent ON bookings(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_session ON bookings(booking_session_id);

CREATE TABLE IF NOT EXISTS processed_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  booking_reference TEXT,
  processed_at TEXT NOT NULL
);
