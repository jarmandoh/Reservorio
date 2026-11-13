-- Reservorio — esquema completo e idempotente
-- Único archivo SQL del proyecto. Se puede aplicar sobre una base vacía o existente
-- con `psql -f db/init.sql` o `pnpm db:migrate`.

CREATE TABLE IF NOT EXISTS businesses (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT '',
  business_type TEXT NOT NULL DEFAULT 'appointment'
    CHECK (business_type IN ('appointment', 'onsite_service', 'no_appointments')),
  profession  TEXT,
  description TEXT NOT NULL DEFAULT '',
  location    TEXT NOT NULL DEFAULT '',
  rating      NUMERIC(4,2) NOT NULL DEFAULT 5.0,
  reviews     INT NOT NULL DEFAULT 0
    CONSTRAINT businesses_reviews_nonnegative_check CHECK (reviews >= 0),
  tags        TEXT NOT NULL DEFAULT '',
  gradient    TEXT NOT NULL DEFAULT 'linear-gradient(135deg,#005bbf,#1a73e8)',
  icon        TEXT NOT NULL DEFAULT 'store',
  schedule    TEXT NOT NULL DEFAULT '',
  logo        TEXT NOT NULL DEFAULT '',
  phone       TEXT NOT NULL DEFAULT '',
  facebook    TEXT NOT NULL DEFAULT '',
  instagram   TEXT NOT NULL DEFAULT '',
  tiktok      TEXT NOT NULL DEFAULT '',
  whatsapp    TEXT NOT NULL DEFAULT '',
  linkedin    TEXT NOT NULL DEFAULT '',
  active      BOOLEAN NOT NULL DEFAULT true,
  pin_hash    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'businesses_rating_range_check'
       AND conrelid = 'businesses'::regclass
  ) THEN
    ALTER TABLE businesses ADD CONSTRAINT businesses_rating_range_check
      CHECK (rating >= 0 AND rating <= 5);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS owners (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS business_owners (
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  owner_id    TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  PRIMARY KEY (business_id, owner_id)
);

CREATE TABLE IF NOT EXISTS services (
  id          SERIAL PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  precio      NUMERIC(12,2),
  variaciones TEXT NOT NULL DEFAULT '',
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

CREATE TABLE IF NOT EXISTS customers (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  phone       TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Campos de consentimiento incluidos en la baseline del esquema.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS data_consent BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT false;

-- Cuentas locales para pruebas. Actívalas explícitamente con SEED_TEST_USERS=on.
DO $$
BEGIN
  IF current_setting('app.seed_test_users', true) = 'on' THEN
    INSERT INTO owners (id, name, email, password_hash)
    VALUES (
      'test-owner',
      'Dueño de prueba',
      'test.owner@example.test',
      '$2b$10$8lHruu4D8PIadWudRNQWAuGN7gcRoHpB3IAhScs2hIFdVfGUFnRB.'
    )
    ON CONFLICT (email) DO UPDATE SET
      name = EXCLUDED.name,
      password_hash = EXCLUDED.password_hash;

    INSERT INTO customers (id, name, email, phone)
    VALUES ('test-customer', 'Cliente de prueba', 'test.customer@example.test', '+573001112233')
    ON CONFLICT (email) DO UPDATE SET
      name = EXCLUDED.name,
      phone = EXCLUDED.phone;

    INSERT INTO businesses (
      id, name, category, business_type, description, location, rating, reviews,
      tags, gradient, icon, schedule, phone, whatsapp, active, pin_hash
    )
    VALUES (
      'reservorio-test-business', 'Negocio de prueba', 'Belleza', 'appointment',
      'Negocio local para validar el flujo de administración y reservas.',
      'Bogotá, Colombia', 4.8, 12, 'pruebas,demostración',
      'linear-gradient(135deg,#005bbf,#1a73e8)', 'store', 'Lun a sáb · 09:00–18:00',
      '+573001112233', '+573001112233', true,
      '$2b$10$VsBiSBMp6HiOSEnRmW4M8el/GxDgyxR6tCQoXpuMB2DrWjJXgwd5O'
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      business_type = EXCLUDED.business_type,
      description = EXCLUDED.description,
      location = EXCLUDED.location,
      rating = EXCLUDED.rating,
      reviews = EXCLUDED.reviews,
      tags = EXCLUDED.tags,
      gradient = EXCLUDED.gradient,
      icon = EXCLUDED.icon,
      schedule = EXCLUDED.schedule,
      phone = EXCLUDED.phone,
      whatsapp = EXCLUDED.whatsapp,
      active = true,
      pin_hash = EXCLUDED.pin_hash;

    INSERT INTO business_owners (business_id, owner_id)
    SELECT 'reservorio-test-business', id FROM owners WHERE email = 'test.owner@example.test'
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Preferencia de SMS del cliente (envío opcional de recordatorios/pagos).
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sms_opt_in BOOLEAN NOT NULL DEFAULT true;

-- Códigos de acceso one-time para clientes (OTP y magic-link).
-- Solo se guarda el hash SHA-256; jamás el código/token en claro.
CREATE TABLE IF NOT EXISTS customer_login_codes (
  id          TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL DEFAULT 'otp' CHECK (kind IN ('otp', 'magic_link')),
  code_hash   TEXT NOT NULL,
  attempts    INT NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_login_codes_hash ON customer_login_codes(code_hash);

CREATE TABLE IF NOT EXISTS bookings (
  id            TEXT PRIMARY KEY,
  provider_id   TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id   TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_id    TEXT NOT NULL,
  booking_date  DATE NOT NULL,
  slot          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes         TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  booking_id  TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  type        TEXT NOT NULL DEFAULT 'booking_created',
  channel     TEXT NOT NULL DEFAULT 'in_app',
  title       TEXT NOT NULL DEFAULT '',
  message     TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payments (
  id                 TEXT PRIMARY KEY,
  booking_id         TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  provider_id        TEXT NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  customer_id        TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  amount             NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency           TEXT NOT NULL DEFAULT 'COP',
  method             TEXT NOT NULL DEFAULT 'card' CHECK (method IN ('card', 'paypal', 'transfer', 'cash')),
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  external_reference TEXT NOT NULL DEFAULT '',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Claves persistentes para reproducir respuestas de operaciones reintentadas.
CREATE TABLE IF NOT EXISTS idempotency_requests (
  scope          TEXT NOT NULL,
  key            TEXT NOT NULL,
  request_hash   TEXT NOT NULL,
  state          TEXT NOT NULL DEFAULT 'processing' CHECK (state IN ('processing', 'completed')),
  owner_token    TEXT NOT NULL,
  lease_until    TIMESTAMPTZ NOT NULL,
  response_status INT,
  response_body  JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, key),
  CHECK ((state = 'processing' AND response_status IS NULL AND response_body IS NULL)
      OR (state = 'completed' AND response_status IS NOT NULL AND response_body IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_idempotency_completed_updated_at
  ON idempotency_requests(updated_at) WHERE state = 'completed';
CREATE INDEX IF NOT EXISTS idx_idempotency_processing_lease
  ON idempotency_requests(lease_until) WHERE state = 'processing';

ALTER TABLE payments ADD COLUMN IF NOT EXISTS idempotency_scope TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS checkout_session_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_idempotency
  ON payments (idempotency_scope, idempotency_key)
  WHERE idempotency_scope IS NOT NULL AND idempotency_key IS NOT NULL;

-- Un event del proveedor se procesa una sola vez, incluso si Stripe lo reenvía.
CREATE TABLE IF NOT EXISTS payment_webhook_events (
  provider       TEXT NOT NULL,
  event_id       TEXT NOT NULL,
  processed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, event_id)
);
CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_processed_at
  ON payment_webhook_events(processed_at);

CREATE INDEX IF NOT EXISTS idx_reservations_business ON reservations(business_id);
CREATE INDEX IF NOT EXISTS idx_notifications_business ON notifications(business_id);
CREATE INDEX IF NOT EXISTS idx_notifications_booking ON notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_services_business ON services(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_bookings_provider ON bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_businesses_active_name ON businesses(name) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_business_owners_owner_business ON business_owners(owner_id, business_id);
CREATE INDEX IF NOT EXISTS idx_notifications_customer ON notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_created ON payments(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_customer_created ON payments(customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS analytics_events (
  id          TEXT PRIMARY KEY,
  event_type  TEXT NOT NULL,
  business_id TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type_created ON analytics_events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_business_created ON analytics_events(business_id, created_at);

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_businesses_name_trgm ON businesses USING GIN(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_businesses_description_trgm ON businesses USING GIN(description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_businesses_location_trgm ON businesses USING GIN(location gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_businesses_category_trgm ON businesses USING GIN(category gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_businesses_profession_trgm ON businesses USING GIN(profession gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_businesses_tags_trgm ON businesses USING GIN(tags gin_trgm_ops);

-- Anti doble-reserva a nivel de base de datos:
-- Una franja ocupada (Reservado/Confirmado/Cancelado) no se puede asignar dos veces al mismo negocio.
CREATE UNIQUE INDEX IF NOT EXISTS uq_reservations_franja
  ON reservations (business_id, franja)
  WHERE disponibilidad <> 'Disponible';

-- Un provider no puede tener dos reservas activas (pending/confirmed) en el mismo día y franja.
CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_active_slot
  ON bookings (provider_id, booking_date, slot)
  WHERE status IN ('pending', 'confirmed');

-- ── Google OAuth columns ─────────────────────────────────────────────────────
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS google_email         TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS google_access_token  TEXT;  -- cifrado AES-256-GCM
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;  -- cifrado AES-256-GCM
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS google_token_expiry  TIMESTAMPTZ;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS google_sheet_id      TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS facebook           TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS instagram          TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tiktok             TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS whatsapp           TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS linkedin           TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS verified           BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS cancellation_policy TEXT NOT NULL DEFAULT 'Cancelar hasta 24 horas antes de tu cita.';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS store_cover_image TEXT NOT NULL DEFAULT '';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS business_type TEXT NOT NULL DEFAULT 'appointment';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS profession TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'businesses_business_type_check'
       AND conrelid = 'businesses'::regclass
  ) THEN
    ALTER TABLE businesses ADD CONSTRAINT businesses_business_type_check
      CHECK (business_type IN ('appointment', 'onsite_service'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'businesses_onsite_profession_required'
       AND conrelid = 'businesses'::regclass
  ) THEN
    ALTER TABLE businesses ADD CONSTRAINT businesses_onsite_profession_required
      CHECK (business_type <> 'onsite_service' OR NULLIF(BTRIM(profession), '') IS NOT NULL);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL DEFAULT '',
  parent_id INT REFERENCES categories(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE categories ADD COLUMN IF NOT EXISTS slug TEXT NOT NULL DEFAULT '';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id INT REFERENCES categories(id) ON DELETE CASCADE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

UPDATE categories
   SET slug = CONCAT(
     NULLIF(TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(name), '[^a-z0-9]+', '-', 'g')), ''),
     '-',
     id
   )
 WHERE slug = '';

CREATE INDEX IF NOT EXISTS idx_categories_parent_active_order
  ON categories(parent_id, is_active, sort_order, name);

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS category_id INT REFERENCES categories(id);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS profession_category_id INT REFERENCES categories(id);

CREATE TABLE IF NOT EXISTS business_categories (
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (business_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_businesses_category_id ON businesses(category_id);
CREATE INDEX IF NOT EXISTS idx_businesses_profession_category_id ON businesses(profession_category_id);

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

CREATE INDEX IF NOT EXISTS idx_business_categories_category_business
  ON business_categories(category_id, business_id);
CREATE INDEX IF NOT EXISTS idx_business_tags_tag_business
  ON business_tags(tag_id, business_id);

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
CREATE INDEX IF NOT EXISTS idx_products_business_active ON products(business_id, active, name);

CREATE TABLE IF NOT EXISTS ratings (
  id SERIAL PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ratings_business ON ratings(business_id);




--datos inicales para categorías y etiquetas--
INSERT INTO categories (name, slug, sort_order) VALUES
  ('Reparaciones del hogar', 'reparaciones-del-hogar', 10),
  ('Construcción y acabados', 'construccion-y-acabados', 20),
  ('Automotores y movilidad', 'automotores-y-movilidad', 30),
  ('Belleza y cuidado personal', 'belleza-y-cuidado-personal', 40),
  ('Jardinería y limpieza', 'jardineria-y-limpieza', 50),
  ('Salud y bienestar', 'salud-y-bienestar', 60),
  ('Educación y asesorías', 'educacion-y-asesorias', 70),
  ('Servicios digitales y creativos', 'servicios-digitales-y-creativos', 80),
  ('Eventos y entretenimiento', 'eventos-y-entretenimiento', 90),
  ('Mascotas', 'mascotas', 100),
  ('Transporte y diligencias', 'transporte-y-diligencias', 110)
ON CONFLICT (name) DO NOTHING;

INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT profession.name, profession.slug, parent.id, profession.sort_order
  FROM (VALUES
    ('Electricista', 'electricista', 'reparaciones-del-hogar', 10),
    ('Plomero', 'plomero', 'reparaciones-del-hogar', 20),
    ('Cerrajero', 'cerrajero', 'reparaciones-del-hogar', 30),
    ('Técnico de electrodomésticos', 'tecnico-de-electrodomesticos', 'reparaciones-del-hogar', 40),
    ('Técnico de aire acondicionado', 'tecnico-de-aire-acondicionado', 'reparaciones-del-hogar', 50),
    ('Técnico de refrigeración', 'tecnico-de-refrigeracion', 'reparaciones-del-hogar', 60),
    ('Carpintero', 'carpintero', 'construccion-y-acabados', 10),
    ('Ebanista', 'ebanista', 'construccion-y-acabados', 20),
    ('Albañil', 'albanil', 'construccion-y-acabados', 30),
    ('Pintor', 'pintor', 'construccion-y-acabados', 40),
    ('Soldador', 'soldador', 'construccion-y-acabados', 50),
    ('Instalador de pisos', 'instalador-de-pisos', 'construccion-y-acabados', 60),
    ('Mecánico automotriz', 'mecanico-automotriz', 'automotores-y-movilidad', 10),
    ('Mecánico de motos', 'mecanico-de-motos', 'automotores-y-movilidad', 20),
    ('Electricista automotriz', 'electricista-automotriz', 'automotores-y-movilidad', 30),
    ('Latonero y pintor automotriz', 'latonero-y-pintor-automotriz', 'automotores-y-movilidad', 40),
    ('Reparador de bicicletas', 'reparador-de-bicicletas', 'automotores-y-movilidad', 50),
    ('Peluquero', 'peluquero', 'belleza-y-cuidado-personal', 10),
    ('Barbero', 'barbero', 'belleza-y-cuidado-personal', 20),
    ('Manicurista', 'manicurista', 'belleza-y-cuidado-personal', 30),
    ('Maquillador', 'maquillador', 'belleza-y-cuidado-personal', 40),
    ('Esteticista', 'esteticista', 'belleza-y-cuidado-personal', 50),
    ('Jardinero', 'jardinero', 'jardineria-y-limpieza', 10),
    ('Fumigador', 'fumigador', 'jardineria-y-limpieza', 20),
    ('Personal de limpieza', 'personal-de-limpieza', 'jardineria-y-limpieza', 30),
    ('Limpiador de muebles y colchones', 'limpiador-de-muebles-y-colchones', 'jardineria-y-limpieza', 40),
    ('Limpiador de piscinas', 'limpiador-de-piscinas', 'jardineria-y-limpieza', 50),
    ('Psicólogo', 'psicologo', 'salud-y-bienestar', 10),
    ('Fisioterapeuta', 'fisioterapeuta', 'salud-y-bienestar', 20),
    ('Nutricionista', 'nutricionista', 'salud-y-bienestar', 30),
    ('Entrenador personal', 'entrenador-personal', 'salud-y-bienestar', 40),
    ('Tutor escolar', 'tutor-escolar', 'educacion-y-asesorias', 10),
    ('Profesor de idiomas', 'profesor-de-idiomas', 'educacion-y-asesorias', 20),
    ('Profesor de música', 'profesor-de-musica', 'educacion-y-asesorias', 30),
    ('Contador', 'contador', 'educacion-y-asesorias', 40),
    ('Abogado', 'abogado', 'educacion-y-asesorias', 50),
    ('Diseñador gráfico', 'disenador-grafico', 'servicios-digitales-y-creativos', 10),
    ('Desarrollador de software', 'desarrollador-de-software', 'servicios-digitales-y-creativos', 20),
    ('Diseñador web', 'disenador-web', 'servicios-digitales-y-creativos', 30),
    ('Fotógrafo', 'fotografo', 'servicios-digitales-y-creativos', 40),
    ('Gestor de redes sociales', 'gestor-de-redes-sociales', 'servicios-digitales-y-creativos', 50),
    ('Organizador de eventos', 'organizador-de-eventos', 'eventos-y-entretenimiento', 10),
    ('Decorador de eventos', 'decorador-de-eventos', 'eventos-y-entretenimiento', 20),
    ('DJ', 'dj', 'eventos-y-entretenimiento', 30),
    ('Músico', 'musico', 'eventos-y-entretenimiento', 40),
    ('Paseador de perros', 'paseador-de-perros', 'mascotas', 10),
    ('Cuidador de mascotas', 'cuidador-de-mascotas', 'mascotas', 20),
    ('Entrenador canino', 'entrenador-canino', 'mascotas', 30),
    ('Veterinario', 'veterinario', 'mascotas', 40),
    ('Mensajero', 'mensajero', 'transporte-y-diligencias', 10),
    ('Transportador de carga', 'transportador-de-carga', 'transporte-y-diligencias', 20),
    ('Guía turístico', 'guia-turistico', 'transporte-y-diligencias', 30)
  ) AS profession(name, slug, parent_slug, sort_order)
  JOIN categories parent ON parent.slug = profession.parent_slug
ON CONFLICT (name) DO NOTHING;

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
('Zapatería')
ON CONFLICT (name) DO NOTHING;

UPDATE categories
   SET slug = CONCAT(
     NULLIF(TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(name), '[^a-z0-9]+', '-', 'g')), ''),
     '-',
     id
   )
 WHERE slug = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_slug
  ON categories(slug)
  WHERE slug <> '';

UPDATE categories child
   SET parent_id = parent.id
  FROM (VALUES
    ('Barbería', 'belleza-y-cuidado-personal'),
    ('Peluquería', 'belleza-y-cuidado-personal'),
    ('Servicios de limpieza', 'jardineria-y-limpieza'),
    ('Servicios de mantenimiento', 'reparaciones-del-hogar')
  ) AS legacy(name, parent_slug)
  JOIN categories parent ON parent.slug = legacy.parent_slug
 WHERE child.name = legacy.name
   AND child.parent_id IS NULL;

UPDATE businesses business
   SET category_id = parent.id,
       profession_category_id = profession.id
  FROM categories profession
  JOIN categories parent ON parent.id = profession.parent_id
 WHERE business.category_id IS NULL
   AND NULLIF(BTRIM(business.profession), '') IS NOT NULL
   AND LOWER(BTRIM(business.profession)) = LOWER(profession.name);

UPDATE businesses business
   SET category_id = category.id
  FROM categories category
 WHERE business.category_id IS NULL
   AND category.parent_id IS NULL
   AND LOWER(BTRIM(business.category)) = LOWER(category.name);

UPDATE businesses business
   SET category_id = profession.parent_id,
       profession_category_id = profession.id
  FROM categories profession
 WHERE business.category_id IS NULL
   AND profession.parent_id IS NOT NULL
   AND (
     LOWER(BTRIM(business.profession)) = LOWER(profession.name)
     OR LOWER(BTRIM(business.category)) = LOWER(profession.name)
   );

INSERT INTO tags (name) VALUES
('Vegano'),
('Sin Gluten'),
('Descuento'),
('Nuevo'),
('Popular')
ON CONFLICT (name) DO NOTHING;

-- ── Row Level Security (RLS) ────────────────────────────────────────────────
-- Los claims se fijan por conexión desde src/db.js.

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

-- Permite volver a ejecutar init.sql sobre una base existente sin duplicar políticas.
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
  (app_rls_role() IN ('anon', 'customer') AND active) OR app_rls_business_access(business_id)
);
CREATE POLICY reservations_rls ON reservations USING (
  app_rls_role() = 'anon' OR app_rls_business_access(business_id)
);
CREATE POLICY customers_rls ON customers USING (
  app_rls_role() IN ('admin', 'auth')
  OR id = app_rls_customer_id()
  OR EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.customer_id = customers.id
      AND app_rls_business_access(bookings.provider_id)
  )
);
CREATE POLICY customer_login_codes_rls ON customer_login_codes USING (
  app_rls_role() IN ('admin', 'auth') OR customer_id = app_rls_customer_id()
);
CREATE POLICY bookings_rls ON bookings USING (
  app_rls_role() = 'admin'
  OR customer_id = app_rls_customer_id()
  OR app_rls_business_access(provider_id)
);
CREATE POLICY notifications_rls ON notifications USING (
  app_rls_role() = 'admin'
  OR customer_id = app_rls_customer_id()
  OR app_rls_business_access(business_id)
);
CREATE POLICY payments_rls ON payments USING (
  app_rls_role() = 'admin'
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
