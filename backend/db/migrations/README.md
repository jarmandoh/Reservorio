# Migraciones SQL

Este directorio contiene el esquema productivo del marketplace.

## Orden recomendado

1. Ejecutar el esquema base actual de la aplicación existente (`backend/db/init.sql`)
2. Ejecutar esta migración para normalizar entidades reales:
   - `001_marketplace_schema.sql`
3. Ejecutar el bloqueo de disponibilidad (anti doble-reserva):
   - `002_availability_locks.sql`

## Ejecución manual

```bash
psql "$DATABASE_URL" -f backend/db/migrations/001_marketplace_schema.sql
```

## Objetivo

La migración crea un modelo de negocio real para:

- `providers`
- `customers`
- `services`
- `bookings`
- `payments`

Y deja espacio para auditoría con `booking_events`.
