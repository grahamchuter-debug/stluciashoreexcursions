CREATE TABLE IF NOT EXISTS operator_action_tokens (
  id TEXT PRIMARY KEY NOT NULL,
  booking_reference TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_operator_action_tokens_ref
  ON operator_action_tokens (booking_reference);

CREATE TABLE IF NOT EXISTS operator_audit_log (
  id TEXT PRIMARY KEY NOT NULL,
  booking_reference TEXT NOT NULL,
  action_type TEXT NOT NULL,
  result TEXT NOT NULL,
  source TEXT NOT NULL,
  token_id TEXT,
  detail TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_operator_audit_log_ref
  ON operator_audit_log (booking_reference);
