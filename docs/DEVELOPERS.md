# Guía para desarrolladores — Reservorio

Esta guía cubre la arquitectura interna del proyecto, las convenciones de desarrollo y el flujo de datos entre capas. El listado de próximas mejoras vive ahora en [`mejoras-futuras.md`](../mejoras-futuras.md).

---

## Tabla de contenidos

1. [Arquitectura general](#1-arquitectura-general)
2. [Backend — Express + PostgreSQL](#2-backend--express--postgresql)
3. [Frontend — Angular 22](#3-frontend--angular-22)
4. [Flujo de autenticación](#4-flujo-de-autenticación)
5. [Convenciones de código](#5-convenciones-de-código)
6. [Notificaciones email/SMS y OTP](#6-notificaciones-emailsms-y-otp)
7. [Agregar un nuevo negocio manualmente (SQL)](#7-agregar-un-nuevo-negocio-manualmente-sql)
8. [Variables de entorno de referencia](#8-variables-de-entorno-de-referencia)

---

## 1. Arquitectura general

```
Navegador
    │
    ▼
┌─────────────────────────────────────────┐
│  Frontend  (Angular 22 + Tailwind CSS)  │
│  Servido por Nginx en el puerto 80      │
│  Nginx proxea /api/* → backend:3000     │
└──────────────┬──────────────────────────┘
               │ HTTP / JSON
               ▼
┌──────────────────────────────────────────┐
│  Backend  (Node.js 22 + Express 5)      │
│  Puerto 3000                             │
│  Helmet · CORS · Rate Limit · JWT        │
└──────────────┬───────────────────────────┘
               │ pg (node-postgres)
               ▼
┌──────────────────────────────────────────┐
│  PostgreSQL 16                           │
│  Puerto 5432 (solo accesible en red      │
│  interna Docker)                         │
└──────────────────────────────────────────┘
```

Todos los servicios corren en la red Docker interna `reservorio-net`. El puerto 5432 de PostgreSQL **no está expuesto al host en producción** — se accede exclusivamente desde el backend.

---

## 2. Backend — Express + PostgreSQL

### Estructura de archivos

```
src/
├── index.js              # Bootstrap: middlewares globales, montaje de rutas, /health y /metrics
├── db.js                 # Pool pg reutilizable (singleton)
├── middleware/
│   ├── auth.js           # requireAuth, requireAdmin, requireOwnerAuth, requireBusinessAuth,
│   │                     #   requireCustomer, requireAnyAuth, canAccessBusinessId
│   ├── errorHandler.js   # notFound + manejo centralizado de errores
│   ├── jwt.js            # sign() y verify() — wrapper sobre jsonwebtoken (HS256, exp 8h)
│   ├── sanitize.js       # clean(), isValidPhone(), validateReservation(), validateUpdate()
│   └── validation.js     # handleValidation para express-validator
├── controllers/          # Handlers finos (bookings, customers)
├── validators/           # Esquemas express-validator (bookings, customers)
├── repositories/
│   └── business.repository.js
├── routes/               # Un router por recurso
├── services/             # Lógica de negocio (auth, customer-auth, businesses, bookings,
│                         #   checkout, customers, payments, notifications, channels,
│                         #   ratings, admin, googleSheets, syncService)
└── utils/
    └── crypto.js         # encrypt/decrypt AES-256-GCM (tokens de Google)
```

### Pool de conexión (`db.js`)

Se exporta un único `Pool` de `pg`. Todos los servicios lo importan directamente:

```js
const db = require('../db');
const { rows } = await db.query('SELECT * FROM businesses WHERE id = $1', [id]);
```

Siempre se usan **parámetros posicionales** (`$1`, `$2`...) — nunca interpolación de strings — para prevenir inyección SQL.

### Middleware de sanitización (`sanitize.js`)

| Función | Propósito |
|---|---|
| `clean(val, maxLen)` | Elimina `< > " ' \`` del input y trunca a `maxLen` (defecto 500) |
| `isValidPhone(phone)` | Valida formato: solo dígitos, `+`, espacios y guiones, 7–15 chars |
| `validateReservation` | Express middleware para `POST /reservations` — valida y sanitiza el body |
| `validateUpdate` | Express middleware para `PUT /reservations/:id` — valida estado y rowIndex |

### Autenticación (`jwt.js`)

Los tokens se generan con `sign(payload)`, firma **HS256**. Expiración: **2 horas** para el token de admin global; **8 horas** para owner, business-admin y customer. Payloads:

```json
// Token admin global
{ "role": "admin" }

// Token de dueño
{ "role": "owner", "ownerId": "own_abc..." }

// Token administrador de negocio
{ "role": "business-admin", "businessId": "cancha_abc_1abc2" }

// Token de cliente
{ "role": "customer", "customerId": "c_abc..." }
```

`JWT_SECRET` debe configurarse en `.env`. Si no está definido, se usa un secreto hardcodeado de desarrollo y se imprime una advertencia en consola. En producción el arranque **aborta** si `JWT_SECRET` es débil.

### Schema de la base de datos (fuente única: `backend/db/init.sql`)

```sql
businesses            id TEXT PK · name · category · description · location · rating · reviews ·
                      tags · gradient · icon · schedule · logo · phone · facebook · instagram ·
                      tiktok · whatsapp · linkedin · active · pin_hash (bcrypt) · google_* · verified ·
                      cancellation_policy · created_at

owners                id TEXT PK · name · email (UNIQUE) · password_hash · created_at
business_owners       business_id FK · owner_id FK (M:N negocio ↔ dueño)

services              id SERIAL PK · business_id FK CASCADE · nombre (UNIQUE por negocio) ·
                      active · created_at

reservations          id SERIAL PK · business_id FK CASCADE · franja · disponibilidad
                      (Disponible|Pendiente|Reservado|Confirmado|Cancelado) · cliente · telefono ·
                      servicio · notas · created_at · updated_at
                      -- Índice único parcial: no hay dos franjas ocupadas iguales por negocio

customers             id TEXT PK · name · email (UNIQUE) · phone · sms_opt_in (defecto true) · created_at

customer_login_codes  customer_id (UNIQUE) FK CASCADE · kind (otp|magic_link) · code_hash (SHA-256) ·
                      attempts · expires_at · created_at
                      -- Solo el hash; jamás el código/token en claro

bookings              id TEXT PK · provider_id FK CASCADE · customer_id FK CASCADE · service_id ·
                      booking_date · slot · status (pending|confirmed|cancelled|completed) · notes ·
                      created_at · updated_at
                      -- Índice único parcial: una reserva activa por slot/día/negocio

payments              id TEXT PK · booking_id FK CASCADE · provider_id · customer_id · amount ·
                      currency (EUR) · method (card|paypal|transfer|cash) · status
                      (pending|paid|failed|refunded) · external_reference · created_at · updated_at

notifications         id TEXT PK · business_id FK CASCADE · customer_id · booking_id · type ·
                      channel (in_app) · title · message · status (queued|sent|failed) · sent_at

categories / tags     catalogos con pivotes business_categories / business_tags
schedules             franjas por negocio y día (day_of_week · open_time · close_time)
ratings               business_id FK CASCADE · rating 1..5 · review · created_at
```

### Endpoints

Ver [backend/README.md](../backend/README.md) (tabla completa) y [API.md](./API.md) (contratos).

---

## 3. Frontend — Angular 22

### Versión y características usadas

- Angular **22** con Standalone Components (sin NgModules), Signals y `inject()`.
- Lazy loading en todas las rutas con `loadComponent` (ver `features/routes.ts`).
- Tailwind CSS 3 + `@tailwindcss/forms`, GSAP 3, Leaflet (mapas).
- URL de API en runtime: `window.__APP_CONFIG__?.apiUrl` (fallback `http://localhost:3000/api` en dev, `/api` en producción).

### Estructura de carpetas

```
src/app/
├── app.component.{ts,html,css}   # Shell raíz — <router-outlet> + <app-toast>
├── app.config.ts                  # provideRouter + provideHttpClient
├── app.routes.ts                  # Exporta featureRoutes
├── core/
│   ├── guards/                    # admin, owner, business, customer
│   ├── models/                    # business, categorias, reservation
│   ├── services/                  # api, auth, storage, toast, offline, admin,
│   │                              #   owner-business, business-admin, business
│   └── state/session.store.ts     # Estado reactivo global (signals)
├── shared/components/             # badge, pin-auth-card, map-modal, business-form, toast
└── features/                      # home, booking, login, admin, business-login,
                                   #   business-admin (+ bulk-slot-generator), owner-*,
                                   #   customer-login, customer-magic-verify,
                                   #   customer-history, payment-success|cancel
```

### Rutas del frontend

| Ruta | Componente | Guard |
|---|---|---|
| `/` | Home | — |
| `/booking/:businessId` | Booking | — |
| `/login` | Login (admin global) | — |
| `/admin` | Admin | `adminGuard` |
| `/business/:businessId/login` | BusinessLogin | — |
| `/business/:businessId/admin` | BusinessAdmin | `businessGuard` |
| `/owner/business/:businessId` | BusinessAdmin | `ownerGuard` |
| `/owner/register` | OwnerRegister | — |
| `/owner/login` | OwnerLogin | — |
| `/owner/dashboard` | OwnerDashboard | `ownerGuard` |
| `/customer/login` | CustomerLogin | — |
| `/customer/history` | CustomerHistory | `customerGuard` |
| `/customer/verify` | CustomerMagicVerify | — |
| `/payment/success` · `/payment/cancel` | PaymentSuccess/Cancel | — |

### `AuthService` — almacenamiento de tokens

Los tokens de admin, dueño y negocio viven en `sessionStorage`; el de cliente en `localStorage` (la sesión "Mi cuenta" persiste):

| Clave | Contenido | Almacenamiento |
|---|---|---|
| `reservorio_admin_jwt` | JWT del administrador global | sessionStorage |
| `reservorio_owner_jwt` | JWT del dueño | sessionStorage |
| `negocio_jwt_<businessId>` | JWT del administrador de cada negocio | sessionStorage |
| `reservorio_customer_jwt` | JWT del cliente | localStorage |
| `reservorio_unlocked` | Flag legacy de sesión (`"1"`) | sessionStorage |
| `reservorio_admin_pin` | PIN legacy | localStorage |

`isTokenValid()` decodifica el payload del JWT en el cliente y compara `exp` con `Date.now()`.

### `ApiService` — comunicación con el backend

Todas las peticiones HTTP pasan por `ApiService`. Los errores se transforman con `handleError()`, que extrae el mensaje del cuerpo de la respuesta antes de lanzar `throwError`.

---

## 4. Flujo de autenticación

### Administrador global

```
POST /api/auth/admin  {pin}
    → backend compara contra ADMIN_PIN del .env (authLimiter 10/15min)
    → devuelve JWT con role: "admin"
    → frontend guarda token en sessionStorage (clave: reservorio_admin_jwt)
    → adminGuard permite acceso a /admin
```

### Dueño (owner)

```
POST /api/auth/owner/register {name, email, password}   → crea owner
POST /api/auth/owner/login {email, password}            → JWT role: "owner"
GET /api/auth/owner/me (Authorization: Bearer owner JWT) → perfil y negocios
    → frontend guarda token (clave: reservorio_owner_jwt)
    → ownerGuard permite acceso a /owner/dashboard y /owner/business/:businessId
```

### Administrador de negocio

```
POST /api/businesses/:id/auth  {pin}
    → backend consulta businesses WHERE id = $1
    → bcrypt.compare(pin, pin_hash)
    → devuelve JWT con role: "business-admin", businessId
    → frontend guarda token en sessionStorage (clave: negocio_jwt_<id>)
    → businessGuard permite acceso a /business/:id/admin
```

### Cliente — login por credenciales

```
POST /api/auth/customer/login {email, phone?}
    → valida el email contra la BD; si el cliente guardó teléfono al registrarse, exige que coincida
    → devuelve JWT role: "customer" + datos del cliente
    → frontend guarda token en localStorage (clave: reservorio_customer_jwt)
    → customerGuard permite acceso a /customer/history
```

### Cliente — OTP (login sin contraseña)

```
POST /api/auth/customer/otp/request {email}
    → genera un código de 6 dígitos (10 min TTL, máx. 5 intentos) y lo envía por email/SMS
    → guarda solo el hash SHA-256 en customer_login_codes
POST /api/auth/customer/otp/verify {email, code}
    → valida con timingSafeEqual, consume el código (one-time) y devuelve el JWT de cliente
```

### Cliente — magic-link

```
POST /api/auth/customer/magic-link/request {email}
    → genera un token (15 min TTL) y envía un email con <FRONTEND_URL>/customer/verify?token=...
POST /api/auth/customer/magic-link/verify {token}
    → valida, consume y devuelve el JWT de cliente
```

Ambos flujos usan `otpLimiter` (30/15min por IP) y respuestas genéricas (no revelan si el email existe). Solo en desarrollo, `OTP_DEBUG=1` expone `debugCode`/`debugToken` en la respuesta.

---

## 5. Convenciones de código

### Backend

- `'use strict'` al inicio de todos los archivos.
- Importaciones con `require`, CommonJS (`"type": "commonjs"`).
- Manejo de errores en rutas: siempre `try/catch`, respuesta `500` con `e.message` (o `errorHandler`).
- Queries paramétricas: **siempre** `$1`, `$2`... Nunca concatenar strings con datos de usuario.
- Sanitizar toda entrada externa con `clean()` antes de insertar en la BD.
- Lógica de negocio en `services/`, acceso a datos en repositorios o servicios, no en las rutas.

### Frontend

- Standalone components — no usar `NgModule`.
- Usar `inject()` en lugar del constructor para dependencias.
- Estado reactivo con Signals — no usar `BehaviorSubject` para estado local.
- Nombres de archivo: `kebab-case.component.ts`.
- Interfaces de datos en `core/models/`.

---

## 6. Notificaciones email/SMS y OTP

`backend/src/services/channels.js` expone `sendEmail()` y `sendSms()` con proveedores configurables por entorno:

- `console` (por defecto): loguea el mensaje y lo guarda en una outbox en memoria (`getOutbox()`), útil en desarrollo y tests.
- `http`: hace `POST` JSON a `EMAIL_WEBHOOK_URL` / `SMS_WEBHOOK_URL` con las cabeceras `EMAIL_WEBHOOK_HEADERS` / `SMS_WEBHOOK_HEADERS` (JSON) y opcional `EMAIL_WEBHOOK_TOKEN` / `SMS_WEBHOOK_TOKEN` (`Authorization: Bearer ...`). Sirve para Resend, SendGrid, Brevo, Twilio, etc., sin dependencias extra.

Los avisos internos (`notifications`) con `customerId` se copian por email al cliente (y SMS en recordatorios/confirmaciones/pagos si `customers.sms_opt_in`) de forma fire-and-forget — `deliverExternalNotification()` en `notifications.service.js`. La autenticación de cliente sin contraseña usa OTP/magic-link (`customer-auth.service.js`): códigos/tokens one-time guardados solo como hash SHA-256 en `customer_login_codes`.

---

## 7. Agregar un nuevo negocio manualmente (SQL)

Si necesitas insertar un negocio directamente en la base de datos (por ejemplo, para pruebas o migración de datos), puedes conectarte al contenedor:

```bash
docker exec -it reservorio-db psql -U reservorio -d reservorio
```

Para hashear un PIN antes de insertarlo:

```bash
node -e "const b = require('bcryptjs'); b.hash('1234', 10).then(console.log)"
```

Luego inserta el negocio:

```sql
INSERT INTO businesses (id, name, category, pin_hash, active)
VALUES ('mi_negocio_1abc2', 'Mi Negocio', 'Salud', '$2a$10$...hash...', true);
```

---

## 8. Variables de entorno de referencia

La fuente de verdad es `backend/.env.example` (todas las opciones, incluidos los canales de email/SMS y `FRONTEND_URL`). Punto de partida mínimo:

```env
# Base de datos
DATABASE_URL=postgres://reservorio:reservorio_pass@localhost:5432/reservorio

# JWT — cambiar a una cadena aleatoria larga en producción
JWT_SECRET=cambia_esto_por_un_secreto_seguro

# PIN del panel de administración global
ADMIN_PIN=1234

# Puerto del servidor (opcional, defecto: 3000)
PORT=3000

# Orígenes permitidos por CORS (opcional)
CORS_ORIGINS=http://localhost,http://localhost:4200

# URL pública del frontend (magic-links de cliente)
FRONTEND_URL=http://localhost:4200

# Canales de notificación (opcional; defecto: console)
EMAIL_PROVIDER=http
EMAIL_WEBHOOK_URL=https://tu-provider.com/api/send
EMAIL_WEBHOOK_HEADERS={"Authorization":"Bearer TU_API_KEY"}
SMS_PROVIDER=http
SMS_WEBHOOK_URL=https://tu-provider.com/api/sms
SMS_WEBHOOK_HEADERS={"Authorization":"Bearer TU_API_KEY"}

# OTP/magic-link — expone el código en las respuestas (SOLO dev/test)
OTP_DEBUG=1
```

---

## Próximas mejoras

Ver el listado priorizado y las recomendaciones en [`mejoras-futuras.md`](../mejoras-futuras.md).