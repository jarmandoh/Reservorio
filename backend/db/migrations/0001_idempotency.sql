CREATE TABLE IF NOT EXISTS idempotency_requests (
  scope           TEXT NOT NULL,
  key             TEXT NOT NULL,
  request_hash    TEXT NOT NULL,
  state           TEXT NOT NULL DEFAULT 'processing' CHECK (state IN ('processing', 'completed')),
  owner_token     TEXT NOT NULL,
  lease_until     TIMESTAMPTZ NOT NULL,
  response_status INT,
  response_body   JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, key),
  CHECK ((state = 'processing' AND response_status IS NULL AND response_body IS NULL)
      OR (state = 'completed' AND response_status IS NOT NULL AND response_body IS NOT NULL))
);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS idempotency_scope TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS checkout_session_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_idempotency
  ON payments (idempotency_scope, idempotency_key)
  WHERE idempotency_scope IS NOT NULL AND idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS payment_webhook_events (
  provider       TEXT NOT NULL,
  event_id       TEXT NOT NULL,
  processed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, event_id)
);
