# Backend — Reservorio API

API REST de **Reservorio**: sistema de reservas multi-negocio. Construida con **Node.js 22 + Express 5** y **PostgreSQL 16**.

## Requisitos

- Node.js `>=22.22.3` (ver `.nvmrc` / `.node-version` en la raíz del repositorio)
- pnpm `>=9.15.0`
- PostgreSQL 16 (o el contenedor `db` de `docker-compose.yml`)

## Puesta en marcha

```bash
pnpm install
cp .env.example .env        # ajusta los valores según tu entorno
pnpm run dev                # arranca con nodemon en http://localhost:3000
```

En Docker la base de datos se levanta con `docker compose up db`, y `DATABASE_URL` ya se inyecta desde `docker-compose.yml`.

## Estructura

```
src/
├── index.js                    # Bootstrap: middlewares globales, montaje de rutas, /health y /metrics
├── db.js                       # Pool de pg (singleton)
├── middleware/
│   ├── auth.js                 # requireAuth, requireAdmin, requireOwnerAuth, requireBusinessAuth,
│   │                           #   requireCustomer, requireAnyAuth, canAccessBusinessId
│   ├── errorHandler.js         # Not found + manejo centralizado de errores
│   ├── jwt.js                  # sign() / verify() — wrapper sobre jsonwebtoken (HS256, exp 8h)
│   ├── sanitize.js             # clean(), isValidPhone(), validateReservation(), validateUpdate()
│   └── validation.js           # handleValidation para express-validator
├── controllers/                # Handlers finos de rutas (bookings, customers)
├── validators/                 # Esquemas express-validator (bookings, customers)
├── repositories/
│   └── business.repository.js  # Acceso a datos de businesses
├── routes/                     # Un router por recurso; ver tabla de endpoints abajo
├── services/                   # Lógica de negocio
│   ├── auth.service.js         # Admin, owners, login de cliente
│   ├── customer-auth.service.js# OTP (SMS/email) y magic-link con hash SHA-256
│   ├── businesses.service.js   # CRUD de negocios, reservaciones y servicios
│   ├── bookings.service.js     # Reservas del marketplace
│   ├── customers.service.js    # Altas y historial de clientes
│   ├── payments.service.js     # Pagos y checkout
│   ├── checkout.service.js     # Checkout de reserva → booking + pago
│   ├── notifications.service.js# Notificaciones + despacho externo email/SMS
│   ├── reminders.worker.js     # Worker de recordatorios agendados (opt-in)
│   ├── channels.js             # Proveedores de envío: console (outbox) o http (webhook)
│   ├── ratings.service.js      # Valoraciones de negocios
│   ├── admin.service.js        # Estadísticas, moderación de reviews/servicios
│   ├── googleSheets.js         # OAuth de Google + Sheets
│   └── syncService.js          # Sincronización con Google Sheets / bulk de franjas
└── utils/
    └── crypto.js               # encrypt/decrypt AES-256-GCM para tokens de Google
```

## Endpoints

Todos bajo `/api/` salvo `/health` y `/metrics`.

| Método y ruta                                                                   | Auth                                | Descripción                                                                                          |
| ------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `POST /auth/admin`                                                              | —                                   | Login del administrador global (PIN). Limiter 10/15min                                               |
| `POST /auth/owner/register`                                                     | —                                   | Alta de dueño (nombre, email, password)                                                              |
| `POST /auth/owner/login`                                                        | —                                   | Login de dueño (email, password)                                                                     |
| `GET /auth/owner/me`                                                            | owner                               | Perfil del dueño                                                                                     |
| `POST /auth/customer/login`                                                     | —                                   | Login de cliente por email/teléfono → JWT                                                            |
| `POST /auth/customer/otp/request`                                               | —                                   | Solicita un código OTP por email/SMS                                                                 |
| `POST /auth/customer/otp/verify`                                                | —                                   | Canjea el OTP por un JWT de cliente                                                                  |
| `POST /auth/customer/magic-link/request`                                        | —                                   | Solicita un enlace de acceso por email                                                               |
| `POST /auth/customer/magic-link/verify`                                         | —                                   | Canjea el enlace por un JWT de cliente                                                               |
| `POST /auth/refresh`                                                            | —                                   | Re-emite un token válido/expirado dentro de la ventana de gracia (`REFRESH_GRACE`). Limiter 60/15min |
| `GET/POST /businesses`                                                          | admin/owner para POST               | Listado público / alta de negocio                                                                    |
| `GET /businesses/all`                                                           | admin                               | Listado completo (incluye inactivos)                                                                 |
| `GET /businesses/owner`                                                         | owner                               | Negocios del dueño logueado                                                                          |
| `POST /businesses/:id/auth`                                                     | —                                   | Login por PIN del negocio → JWT business-admin                                                       |
| `PUT /businesses/:id`                                                           | business-admin                      | Actualización del negocio                                                                            |
| `PATCH /businesses/:id/toggle`                                                  | admin                               | Activar/desactivar                                                                                   |
| `PATCH /businesses/:id/verify`                                                  | admin                               | Marcar como verificado                                                                               |
| `DELETE /businesses/:id`                                                        | admin                               | Eliminar negocio (cascada)                                                                           |
| `GET /businesses/:id`                                                           | business-admin                      | Detalle del negocio                                                                                  |
| `GET /businesses/:id/availability`                                              | —                                   | Disponibilidad de franjas del negocio                                                                |
| `GET/POST /businesses/:id/reservations`                                         | GET: business-admin / POST: público | Franjas y reservaciones del negocio                                                                  |
| `PUT /businesses/:id/reservations/:row`                                         | business-admin                      | Cambiar estado/notas de una franja                                                                   |
| `POST /businesses/:id/checkout`                                                 | —                                   | Checkout de reserva (crea booking + pago)                                                            |
| `GET/POST /businesses/:id/services`                                             | POST: business-admin                | Servicios del negocio                                                                                |
| `DELETE /businesses/:id/services/:nombre`                                       | business-admin                      | Eliminar servicio                                                                                    |
| `GET/POST /customers`                                                           | —                                   | Listado (admin) / alta de cliente                                                                    |
| `GET /customers/email/:email`                                                   | —                                   | Buscar cliente por email                                                                             |
| `GET /customers/me`                                                             | customer                            | Perfil del cliente logueado                                                                          |
| `GET /customers/:id/history`                                                    | customer (self)                     | Historial de reservas del cliente                                                                    |
| `GET/POST /bookings`                                                            | —                                   | Reservas del marketplace                                                                             |
| `GET/POST /payments`, `POST /payments/checkout`                                 | PATCH: auth                         | Pagos y sesión de checkout                                                                           |
| `POST /payments/webhook`                                                        | —                                   | Webhook de pasarela (firma `stripe-signature`)                                                       |
| `GET/POST /notifications`, `POST /notifications/reminder`                       | —                                   | Avisos internos y recordatorios                                                                      |
| `GET/POST /ratings/:businessId`, `GET /ratings/:businessId/average`             | —                                   | Valoraciones                                                                                         |
| `GET /categories`, `GET /categories/all`                                        | —                                   | Categorías                                                                                           |
| `GET /tags/all`                                                                 | —                                   | Etiquetas                                                                                            |
| `GET /ux-tips`                                                                  | —                                   | Sugerencias de UX para el panel                                                                      |
| `GET /google/...`                                                               | any-auth                            | OAuth de Google (start, callback, status, disconnect, create/link sheet, sync)                       |
| `GET/POST /admin/stats`, `/admin/payments`, `/admin/reviews`, `/admin/services` | admin                               | Panel de administración global                                                                       |
| `GET/POST/DELETE /reservations`, `GET/POST/DELETE /services`                    | —                                   | Endpoints legacy (compatibilidad)                                                                    |
| `GET /health`                                                                   | —                                   | Salud del proceso + `SELECT 1` contra la BD                                                          |
| `GET /metrics`                                                                  | —                                   | Uptime, requests, errores, memoria, versión de Node                                                  |

> `/api/providers` es un alias de compatibilidad de `/api/businesses`.

Referencia completa de contratos: [docs/API.md](../docs/API.md).

## Roles y tokens

| Rol              | Obtención                                    | Expiración | Uso                                         |
| ---------------- | -------------------------------------------- | ---------- | ------------------------------------------- |
| `admin`          | `POST /auth/admin`                           | 2h         | Panel global                                |
| `owner`          | `POST /auth/owner/register` / `login`        | 8h         | Panel de dueños                             |
| `business-admin` | `POST /businesses/:id/auth`                  | 8h         | Panel del negocio (`businessId` en payload) |
| `customer`       | `POST /auth/customer/login` o OTP/magic-link | 8h         | Panel "Mi cuenta"                           |

> **Renovación**: `POST /auth/refresh` re-firma el token de cualquier rol (admin 2 h, resto 8 h) dentro de la ventana de gracia, evitando cortar sesiones activas. El frontend lo llama de forma periódica y silenciosa.

## Seguridad

- Queries paramétricas (`$1`, `$2`...), sanitización con `clean()` y validación `express-validator`.
- Rate limiting global (`60 req / 15 min` por IP), `authLimiter` (10/15min), `otpLimiter` (30/15min) y `refreshLimiter` (60/15min) para autenticación.
- `helmet` + CORS restringido por `CORS_ORIGINS`.
- `JWT_SECRET` estricto: el arranque aborta en producción si es débil, si `ADMIN_PIN` es `1234`, o si falta `CORS_ORIGINS`.
- PIN admin comparado con **bcrypt** (hash derivado de `ADMIN_PIN` o `ADMIN_PIN_HASH`); PINs de negocio con bcrypt (cost 10); códigos OTP/magic-link guardados **solo como hash SHA-256**.
- En producción aborta con alerta si `OTP_DEBUG=1`.

## Migraciones SQL

```bash
pnpm db:migrate            # aplica las pendientes de db/migrations/ (idempotente, en transacciones)
pnpm db:migrate:create -- nombre  # crea el siguiente NNNN_*.sql
```

`0001_init.sql` = baseline equivalente a `db/init.sql` (fuente para contenedores nuevos). El `Dockerfile` ejecuta `db:migrate` antes de arrancar, por lo que los cambios de schema llegan solos en despliegues sobre volúmenes existentes.

## Notificaciones email/SMS (`channels.js`)

- Proveedor `console` (defecto): loguea y guarda en una outbox en memoria (`getOutbox()`, `resetOutbox()`).
- Proveedor `http`: `POST` JSON a `EMAIL_WEBHOOK_URL` / `SMS_WEBHOOK_URL` con cabeceras `EMAIL_WEBHOOK_HEADERS` / `SMS_WEBHOOK_HEADERS` y token Bearer opcional (compatible con Resend, SendGrid, Brevo, Twilio...).

## Recordatorios agendados

`services/reminders.worker.js` revisa cada `REMINDER_INTERVAL_MINUTES` (60) las reservas cuyo inicio cae en `REMINDER_WINDOW_HOURS` (24) y crea el recordatorio (email + SMS si `sms_opt_in`) sin duplicados. Opt-in: `ENABLE_REMINDER_WORKER=1` en el arranque de `index.js`. Sus tests unitarios (`test/reminders.worker.test.js`) mocks DB y canal de envío.

## Tests

```bash
pnpm test                 # 28 suites / 125 tests (jest --runInBand; integración solo con RUN_INTEGRATION=1)
pnpm test:integration     # requiere Postgres real (RUN_INTEGRATION=1 + DATABASE_URL)
```

## Variables de entorno

Recuerda: también están documentadas en `.env.example` y `docker-compose.yml`.

| Variable                                                                     | Descripción                                                                            |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `PORT`                                                                       | Puerto del servidor (defecto 3000)                                                     |
| `DATABASE_URL`                                                               | Cadena de conexión PostgreSQL                                                          |
| `JWT_SECRET`                                                                 | Clave de firma de JWT (obligatoria y fuerte en producción)                             |
| `ADMIN_PIN`                                                                  | PIN del panel global (defecto 1234; se compara contra bcrypt)                          |
| `ADMIN_PIN_HASH`                                                             | Hash bcrypt del PIN de admin (alternativa segura; si se define, `ADMIN_PIN` se ignora) |
| `REFRESH_GRACE`                                                              | Horas de ventana para reemitir tokens expirados (defecto 6)                            |
| `ENABLE_REMINDER_WORKER`                                                     | `1` activa el worker de recordatorios agendados                                        |
| `REMINDER_WINDOW_HOURS` / `REMINDER_INTERVAL_MINUTES`                        | Ventana previa a la reserva (24) y cadencia del worker (60)                            |
| `CORS_ORIGINS`                                                               | Orígenes permitidos, separados por coma                                                |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_TOKENS_KEY`            | OAuth de Google Sheets                                                                 |
| `EMAIL_PROVIDER`, `EMAIL_FROM`, `EMAIL_WEBHOOK_URL`, `EMAIL_WEBHOOK_HEADERS` | Canal de email                                                                         |
| `SMS_PROVIDER`, `SMS_WEBHOOK_URL`, `SMS_WEBHOOK_HEADERS`                     | Canal de SMS                                                                           |
| `FRONTEND_URL`                                                               | URL pública del frontend (magic-link)                                                  |
| `OTP_DEBUG`                                                                  | Exponer el código/token en la respuesta (solo dev/test)                                |
