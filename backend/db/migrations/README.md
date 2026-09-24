# Migraciones SQL

**El esquema vive en `backend/db/init.sql`**, que es la única fuente de verdad: se ejecuta
automáticamente al crear el contenedor por primera vez (`docker-entrypoint-initdb.d`).

El directorio `migrations/` queda retirado:

- `001_marketplace_schema.sql` (retirado): proponía un modelo marketplace con `providers` /
  `bookings` / `payments` con UUID. Divergía del esquema real que usa la aplicación
  (id de `businesses` TEXT y `bookings`/`customers`/`notifications` también TEXT) y el
  código nunca la utilizaba. `customers`, `bookings`, `notifications` y ahora `payments`
  ya están definidos en `init.sql` con FKs coherentes.
- `002_availability_locks.sql` (retirado): sus índices únicos parciales
  (`uq_reservations_franja`, `uq_bookings_active_slot`) se movieron a `init.sql`, por lo que
  una base recién creada ya viene protegida contra dobles reservas.

## Si ya tienes una base creada con el esquema antiguo

Para alinear una base existente a `init.sql`, elimina los objetos fuera de lugar antes de
volver a aplicar el esquema:

```bash
# (opcional) solo si aplicaste la antigua 001 en algún entorno
DROP TABLE IF EXISTS booking_events, payments, providers CASCADE;
```

Después recrea lo que falte aplicando `init.sql` (sus `CREATE TABLE IF NOT EXISTS` /
`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` son idempotentes):

```bash
psql "$DATABASE_URL" -f backend/db/init.sql
```