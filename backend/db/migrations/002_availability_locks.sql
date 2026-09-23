-- 002_availability_locks.sql
-- Bloqueo de disponibilidad a nivel de base de datos para evitar dobles reservas.
--
-- Ejecutar tras `001_marketplace_schema.sql`:
--   psql "$DATABASE_URL" -f backend/db/migrations/002_availability_locks.sql

-- Una franja horaria ocupada (Reservado/Confirmado/Cancelado por cliente) no puede
-- asignarse a más de una reserva del mismo negocio.
CREATE UNIQUE INDEX IF NOT EXISTS uq_reservations_franja
  ON reservations (business_id, franja)
  WHERE disponibilidad <> 'Disponible';

-- En el marketplace, un provider no puede tener dos reservas activas (pending/confirmed)
-- en el mismo día y franja.
CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_active_slot
  ON bookings (provider_id, booking_date, slot)
  WHERE status IN ('pending', 'confirmed');