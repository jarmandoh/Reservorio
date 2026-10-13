-- Mejora búsquedas ILIKE y asegura rangos de datos nuevos.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_businesses_active_name
  ON businesses (name) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_businesses_name_trgm
  ON businesses USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_businesses_description_trgm
  ON businesses USING GIN (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_businesses_location_trgm
  ON businesses USING GIN (location gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_businesses_category_trgm
  ON businesses USING GIN (category gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_businesses_profession_trgm
  ON businesses USING GIN (profession gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_businesses_tags_trgm
  ON businesses USING GIN (tags gin_trgm_ops);

-- Los índices compuestos de PK cubren business_id; estos habilitan joins desde el otro lado.
CREATE INDEX IF NOT EXISTS idx_business_owners_owner_business
  ON business_owners (owner_id, business_id);
CREATE INDEX IF NOT EXISTS idx_business_categories_category_business
  ON business_categories (category_id, business_id);
CREATE INDEX IF NOT EXISTS idx_business_tags_tag_business
  ON business_tags (tag_id, business_id);
CREATE INDEX IF NOT EXISTS idx_notifications_customer
  ON notifications (customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking
  ON payments (booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_created
  ON payments (provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_customer_created
  ON payments (customer_id, created_at DESC);

-- NOT VALID evita bloquear el despliegue si existen valores históricos fuera de rango.
-- PostgreSQL sí aplica estas reglas a inserciones y actualizaciones nuevas.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_rating_range_check' AND conrelid = 'businesses'::regclass) THEN
    ALTER TABLE businesses ADD CONSTRAINT businesses_rating_range_check
      CHECK (rating >= 0 AND rating <= 5) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_reviews_nonnegative_check' AND conrelid = 'businesses'::regclass) THEN
    ALTER TABLE businesses ADD CONSTRAINT businesses_reviews_nonnegative_check
      CHECK (reviews >= 0) NOT VALID;
  END IF;
END $$;
