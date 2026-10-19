-- RLS para el acceso del backend. Los claims se fijan por conexión desde src/db.js.

-- Algunas instalaciones antiguas no traen esta tabla de telemetría del baseline.
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  business_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  image_url TEXT NOT NULL,
  image_public_id TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION app_rls_role() RETURNS text
LANGUAGE sql STABLE AS $$ SELECT COALESCE(NULLIF(current_setting('app.rls.role', true), ''), 'anon') $$;

CREATE OR REPLACE FUNCTION app_rls_business_id() RETURNS text
LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.rls.business_id', true), '') $$;

CREATE OR REPLACE FUNCTION app_rls_owner_id() RETURNS text
LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.rls.owner_id', true), '') $$;

CREATE OR REPLACE FUNCTION app_rls_customer_id() RETURNS text
LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.rls.customer_id', true), '') $$;

CREATE OR REPLACE FUNCTION app_rls_business_access(target_business_id text) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT app_rls_role() = 'admin'
      OR (app_rls_role() = 'business-admin' AND app_rls_business_id() = target_business_id)
      OR (app_rls_role() = 'owner' AND EXISTS (
        SELECT 1 FROM business_owners
        WHERE business_id = target_business_id AND owner_id = app_rls_owner_id()
      ));
$$;

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_login_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhook_events ENABLE ROW LEVEL SECURITY;

-- Evita que el propietario de las tablas omita RLS accidentalmente.
ALTER TABLE businesses FORCE ROW LEVEL SECURITY;
ALTER TABLE business_owners FORCE ROW LEVEL SECURITY;
ALTER TABLE owners FORCE ROW LEVEL SECURITY;
ALTER TABLE services FORCE ROW LEVEL SECURITY;
ALTER TABLE reservations FORCE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
ALTER TABLE customer_login_codes FORCE ROW LEVEL SECURITY;
ALTER TABLE bookings FORCE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;
ALTER TABLE analytics_events FORCE ROW LEVEL SECURITY;
ALTER TABLE categories FORCE ROW LEVEL SECURITY;
ALTER TABLE business_categories FORCE ROW LEVEL SECURITY;
ALTER TABLE schedules FORCE ROW LEVEL SECURITY;
ALTER TABLE tags FORCE ROW LEVEL SECURITY;
ALTER TABLE business_tags FORCE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;
ALTER TABLE ratings FORCE ROW LEVEL SECURITY;
ALTER TABLE idempotency_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE payment_webhook_events FORCE ROW LEVEL SECURITY;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'businesses', 'business_owners', 'owners', 'services', 'reservations',
    'customers', 'customer_login_codes', 'bookings', 'notifications', 'payments',
    'analytics_events', 'categories', 'business_categories', 'schedules', 'tags',
    'business_tags', 'products', 'ratings', 'idempotency_requests', 'payment_webhook_events'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', table_name || '_rls', table_name);
  END LOOP;
END $$;

CREATE POLICY businesses_rls ON businesses USING (
  (app_rls_role() = 'anon' AND active)
  OR app_rls_business_access(id)
);
CREATE POLICY business_owners_rls ON business_owners USING (
  app_rls_role() = 'admin' OR owner_id = app_rls_owner_id() OR business_id = app_rls_business_id()
);
CREATE POLICY owners_rls ON owners USING (app_rls_role() IN ('admin', 'auth') OR id = app_rls_owner_id());
CREATE POLICY services_rls ON services USING (
  (app_rls_role() = 'anon' AND active) OR app_rls_business_access(business_id)
);
CREATE POLICY reservations_rls ON reservations USING (
  app_rls_role() = 'anon' OR app_rls_business_access(business_id)
);
CREATE POLICY customers_rls ON customers USING (
  app_rls_role() IN ('admin', 'anon', 'auth') OR id = app_rls_customer_id()
);
CREATE POLICY customer_login_codes_rls ON customer_login_codes USING (
  app_rls_role() IN ('admin', 'auth') OR customer_id = app_rls_customer_id()
);
CREATE POLICY bookings_rls ON bookings USING (
  app_rls_role() IN ('admin', 'anon')
  OR customer_id = app_rls_customer_id()
  OR app_rls_business_access(provider_id)
);
CREATE POLICY notifications_rls ON notifications USING (
  app_rls_role() IN ('admin', 'anon')
  OR customer_id = app_rls_customer_id()
  OR app_rls_business_access(business_id)
);
CREATE POLICY payments_rls ON payments USING (
  app_rls_role() IN ('admin', 'anon')
  OR customer_id = app_rls_customer_id()
  OR app_rls_business_access(provider_id)
);
CREATE POLICY analytics_events_rls ON analytics_events USING (
  app_rls_role() IN ('admin', 'anon') OR app_rls_business_access(business_id)
);
CREATE POLICY categories_rls ON categories USING (true);
CREATE POLICY business_categories_rls ON business_categories USING (
  app_rls_role() = 'anon' OR app_rls_business_access(business_id)
);
CREATE POLICY schedules_rls ON schedules USING (
  app_rls_role() = 'anon' OR app_rls_business_access(business_id)
);
CREATE POLICY tags_rls ON tags USING (true);
CREATE POLICY business_tags_rls ON business_tags USING (
  app_rls_role() = 'anon' OR app_rls_business_access(business_id)
);
CREATE POLICY products_rls ON products USING (
  (app_rls_role() = 'anon' AND active) OR app_rls_business_access(business_id)
);
CREATE POLICY ratings_rls ON ratings USING (app_rls_role() IN ('admin', 'anon') OR app_rls_business_access(business_id));
CREATE POLICY idempotency_requests_rls ON idempotency_requests USING (app_rls_role() IN ('admin', 'anon'));
CREATE POLICY payment_webhook_events_rls ON payment_webhook_events USING (app_rls_role() IN ('admin', 'anon'));
