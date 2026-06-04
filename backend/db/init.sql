-- Reservorio — schema inicial
-- Se ejecuta automáticamente al crear el contenedor por primera vez.

CREATE TABLE IF NOT EXISTS businesses (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  location    TEXT NOT NULL DEFAULT '',
  rating      NUMERIC(4,2) NOT NULL DEFAULT 5.0,
  reviews     INT NOT NULL DEFAULT 0,
  tags        TEXT NOT NULL DEFAULT '',
  gradient    TEXT NOT NULL DEFAULT 'linear-gradient(135deg,#005bbf,#1a73e8)',
  icon        TEXT NOT NULL DEFAULT 'store',
  schedule    TEXT NOT NULL DEFAULT '',
  logo        TEXT NOT NULL DEFAULT '',
  phone       TEXT NOT NULL DEFAULT '',
  active      BOOLEAN NOT NULL DEFAULT true,
  pin_hash    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
  id          SERIAL PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, nombre),
  active      BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS reservations (
  id              SERIAL PRIMARY KEY,
  business_id     TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  franja          TEXT NOT NULL,
  disponibilidad  TEXT NOT NULL DEFAULT 'Disponible',
  cliente         TEXT NOT NULL DEFAULT '',
  telefono        TEXT NOT NULL DEFAULT '',
  servicio        TEXT NOT NULL DEFAULT '',
  notas           TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reservations_business ON reservations(business_id);
CREATE INDEX IF NOT EXISTS idx_services_business ON services(business_id);

-- ── Google OAuth columns ─────────────────────────────────────────────────────
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS google_email         TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS google_access_token  TEXT;  -- cifrado AES-256-GCM
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;  -- cifrado AES-256-GCM
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS google_token_expiry  TIMESTAMPTZ;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS google_sheet_id      TEXT;


CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS business_categories (
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (business_id, category_id)
);

CREATE TABLE IF NOT EXISTS schedules (
  id SERIAL PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  UNIQUE (business_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS business_tags (
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  tag_id INT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (business_id, tag_id)
);

