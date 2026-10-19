CREATE INDEX IF NOT EXISTS idx_idempotency_completed_updated_at
  ON idempotency_requests(updated_at) WHERE state = 'completed';
CREATE INDEX IF NOT EXISTS idx_idempotency_processing_lease
  ON idempotency_requests(lease_until) WHERE state = 'processing';
CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_processed_at
  ON payment_webhook_events(processed_at);
