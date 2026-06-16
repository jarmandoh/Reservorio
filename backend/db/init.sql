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

CREATE TABLE IF NOT EXISTS ratings (
  id SERIAL PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ratings_business ON ratings(business_id);




--datos inicales para categorías y etiquetas--
INSERT INTO categories (name) VALUES
('Abarrotes'),
('Agencia de Viajes'),
('Bar'),
('Barbería'),
('Café'),
('Centro de Convenciones'),
('Centro de Yoga'),
('Cine'),
('Clínica Médica'),
('Clínica Veterinaria'),
('Discoteca'),
('Estudio de Arte'),
('Farmacia'),
('Floristería'),
('Galería de Arte'),
('Gimnasio'),
('Heladería'),
('Joyería'),
('Librería'),
('Museo'),
('Panadería'),
('Parque de Atracciones'),
('Peluquería'),
('Peluquería'),
('Productos agropecuarios'),
('Restaurante'),
('Salón de Belleza'),
('Servicios de consultoría empresarial'),
('Servicios de diseño gráfico'),
('Servicios de educación'),
('Servicios de entretenimiento'),
('Servicios de eventos'),
('Servicios de fotografía'),
('Servicios de limpieza'),
('Servicios de mantenimiento'),
('Servicios de marketing digital'),
('Servicios de recursos humanos'),
('Servicios de salud mental'),
('Servicios de tecnología'),
('Servicios de traducción e interpretación'),
('Servicios de transporte'),
('Servicios de desarrollo web y software'),
('Servicios legales'),
('Spa'),
('Taller de Reparación'),
('Tienda de Bicicletas'),
('Tienda de Cosméticos'),
('Tienda de Decoración'),
('Tienda de Deportes'),
('Tienda de Electrónica'),
('Tienda de Electrónica de Consumo'),
('Tienda de Instrumentos Musicales'),
('Tienda de Juguetes'),
('Tienda de Mascotas'),
('Tienda de Muebles'),
('Tienda de Productos Naturales'),
('Tienda de Regalos'),
('Tienda de Ropa'),
('Tienda de Ropa Deportiva'),
('Zapatería');

INSERT INTO tags (name) VALUES
('Vegano'),
('Sin Gluten'),
('Descuento'),
('Nuevo'),
('Popular');