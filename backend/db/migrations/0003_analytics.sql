-- Analítica ligera para el embudo de conversión (vista -> reserva -> pago).
-- Solo eventos públicos y ligeros (vistas de negocio); se vacía/rota en producción.
CREATE TABLE IF NOT EXISTS analytics_events (
  id          TEXT PRIMARY KEY,
  event_type  TEXT NOT NULL,
  business_id TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_event_type_created ON analytics_events (event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_business_created ON analytics_events (business_id, created_at);