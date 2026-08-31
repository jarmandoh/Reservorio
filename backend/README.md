# Reservorio Backend

## 1. Visión general

El backend de Reservorio expone una API REST para un marketplace de servicios con:

- proveedores / negocios
- clientes
- servicios ofertados
- reservas agendadas
- pagos asociados a reservas
- autenticación de administradores y dueños

La API está construida sobre Node.js 22 + Express y usa PostgreSQL para persistencia. El diseño está orientado a un marketplace real, con compatibilidad con módulos existentes y rutas legacy para no romper el proyecto actual.

---

## 2. Arquitectura

### Capa de aplicación

```text
backend/
├── src/
│   ├── index.js              # arranque de la API
│   ├── db.js                 # Pool de PostgreSQL
│   ├── controllers/          # handlers HTTP
│   ├── services/             # lógica de negocio
│   ├── validators/           # validaciones con express-validator
│   ├── routes/               # endpoints REST
│   ├── middleware/           # auth, validation, error handling, sanitization
│   └── utils/                # helpers
├── db/
│   ├── init.sql              # esquema base actual
│   └── migrations/
│       ├── README.md
│       └── 001_marketplace_schema.sql
├── test/
├── package.json
├── Dockerfile
└── .env.example
```

### Roles

- `admin`: panel global
- `owner`: dueño de un negocio o proveedor
- `business-admin`: permiso por negocio autenticado con PIN
- `customer`: cliente del marketplace

---

## 3. Entidades del negocio

### Providers

Representan los proveedores o negocios que ofrecen servicios.

```sql
providers (
  id UUID PK,
  owner_id UUID NULL,
  name TEXT,
  slug TEXT UNIQUE,
  category TEXT,
  description TEXT,
  location TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  banner_url TEXT,
  rating NUMERIC,
  review_count INTEGER,
  active BOOLEAN,
  pin_hash TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### Customers

```sql
customers (
  id UUID PK,
  first_name TEXT,
  last_name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### Services

```sql
services (
  id UUID PK,
  provider_id UUID FK,
  title TEXT,
  description TEXT,
  duration_min INTEGER,
  price_cents INTEGER,
  currency TEXT,
  active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### Bookings

```sql
bookings (
  id UUID PK,
  provider_id UUID FK,
  customer_id UUID FK,
  service_id UUID FK,
  booking_date DATE,
  slot_start TIME,
  slot_end TIME,
  status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### Payments

```sql
payments (
  id UUID PK,
  booking_id UUID FK,
  provider_id UUID FK,
  customer_id UUID FK,
  amount_cents INTEGER,
  currency TEXT,
  status TEXT,
  provider_fee_cents INTEGER,
  platform_fee_cents INTEGER,
  payment_method TEXT,
  external_reference TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

---

## 4. Endpoints productivos

### Auth

- `POST /api/auth/admin`
- `POST /api/auth/owner/register`
- `POST /api/auth/owner/login`
- `GET /api/auth/owner/me`

### Providers / businesses

- `GET /api/providers`
- `GET /api/providers/all`
- `GET /api/providers/owner`
- `POST /api/providers`
- `GET /api/providers/:id`
- `PUT /api/providers/:id`
- `PATCH /api/providers/:id/toggle`
- `DELETE /api/providers/:id`
- `POST /api/providers/:id/auth`

### Customers

- `GET /api/customers`
- `POST /api/customers`

### Bookings

- `GET /api/bookings`
- `POST /api/bookings`

### Legacy compatibility

- `GET /api/businesses`
- `POST /api/businesses/:id/reservations`
- `GET /api/services?businessId=...`
- `POST /api/services`

Estas rutas legacy se mantienen para no romper la versión antigua mientras evoluciona el producto.

---

## 5. Flujo de negocio

### Flujo de cliente

1. El cliente consulta proveedores activos.
2. El cliente selecciona un proveedor y un servicio.
3. Se crea una reserva con fecha, hora y notas.
4. El sistema valida disponibilidad y genera un registro de booking.
5. Se puede asociar un pago a la reserva.

### Flujo de proveedor

1. El proveedor se autentica con su PIN o mediante token owner/admin.
2. Gestiona servicios, horarios y disponibilidad.
3. Confirma o cancela reservas.
4. Revisa el estado de pagos y reservas.

### Flujo de admin

1. Admin global revisa negocios activos e inactivos.
2. Controla la operación del marketplace.
3. Modifica o habilita proveedores.

---

## 6. Criterios de persistencia

- Se usan consultas parametrizadas con `$1`, `$2`, etc.
- Los campos sensibles (PIN, tokens, secretos) no deben exponerse en respuestas.
- La API pública usa nombres de campo amigables para frontend (`providerId`, `customerId`, `bookingDate`, etc.).
- El almacenamiento en PostgreSQL sigue usando nombres internos normalizados.

---

## 7. Variables de entorno

```env
DATABASE_URL=postgres://reservorio:reservorio_pass@localhost:5432/reservorio
JWT_SECRET=tu_secreto_largo_y_aleatorio
ADMIN_PIN=1234
PORT=3000
CORS_ORIGINS=http://localhost:4200,http://localhost:3000
NODE_ENV=development
```

---

## 8. Migración real desde el modelo actual

La migración recomendada está en:

- [backend/db/migrations/001_marketplace_schema.sql](db/migrations/001_marketplace_schema.sql)

### Paso a paso

1. Mantener el esquema actual de `businesses`, `owners`, `reservations`, `services`.
2. Crear las nuevas tablas `providers`, `customers`, `bookings`, `payments`.
3. Migrar los datos actuales de `businesses` a `providers`.
4. Migrar la relación de dueños y clientes existentes.
5. Conectar reservas actuales a `bookings` o mantener una visión híbrida durante la transición.

---

## 9. Validación

Se valida con Jest y la API actual:

```bash
cd backend
pnpm test
```

La suite actual queda verde con la capa productiva preparada.

---

## 10. Recomendación final

Para un despliegue real, conviene evolucionar al modelo de `providers`/`customers`/`bookings`/`payments` como fuente de verdad del marketplace, dejando las rutas legacy como compatibilidad temporal durante la migración del frontend y la lógica de negocio.
