-- =========================================================
-- Reservorio — Marketplace schema migration
-- =========================================================

BEGIN;

-- 1) Providers / businesses
CREATE TABLE IF NOT EXISTS providers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID NULL,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  category        TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  location        TEXT NOT NULL DEFAULT '',
  phone           TEXT NOT NULL DEFAULT '',
  email           TEXT NOT NULL DEFAULT '',
  website         TEXT NOT NULL DEFAULT '',
  logo_url        TEXT NOT NULL DEFAULT '',
  banner_url      TEXT NOT NULL DEFAULT '',
  rating          NUMERIC(3,2) NOT NULL DEFAULT 0,
  review_count    INTEGER NOT NULL DEFAULT 0,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  pin_hash        TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_providers_owner_id ON providers(owner_id);
CREATE INDEX IF NOT EXISTS idx_providers_category ON providers(category);
CREATE INDEX IF NOT EXISTS idx_providers_active ON providers(active);

-- 2) Customers
CREATE TABLE IF NOT EXISTS customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL DEFAULT '',
  email           TEXT NOT NULL UNIQUE,
  phone           TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- 3) Services
CREATE TABLE IF NOT EXISTS services (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  duration_min    INTEGER NOT NULL DEFAULT 30,
  price_cents     INTEGER NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'EUR',
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_provider_id ON services(provider_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);

-- 4) Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  service_id      UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  booking_date    DATE NOT NULL,
  slot_start      TIME NOT NULL,
  slot_end        TIME NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes           TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);

-- 5) Payments
CREATE TABLE IF NOT EXISTS payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  provider_id         UUID NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
  customer_id         UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  amount_cents        INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency            TEXT NOT NULL DEFAULT 'EUR',
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  provider_fee_cents  INTEGER NOT NULL DEFAULT 0,
  platform_fee_cents  INTEGER NOT NULL DEFAULT 0,
  payment_method      TEXT NOT NULL DEFAULT 'manual',
  external_reference  TEXT NOT NULL DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_id ON payments(provider_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- 6) Optional audit metadata
CREATE TABLE IF NOT EXISTS booking_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_events_booking_id ON booking_events(booking_id);

COMMIT;
