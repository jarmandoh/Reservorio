# API — Referencia

API REST de **Reservorio**. Base URL: `/api` (proxy en producción `/api/* → backend:3000`).

## Convenciones

### Autenticación

La mayoría de los endpoints requieren un JWT en la cabecera:

```
Authorization: Bearer <token>
```

| Rol | Obtención | Expiración |
|---|---|---|
| `admin` | `POST /api/auth/admin` | 2 h |
| `owner` | `POST /api/auth/owner/register` / `owner/login` | 8 h |
| `business-admin` | `POST /api/businesses/:id/auth` | 8 h |
| `customer` | `POST /api/auth/customer/login`, OTP o magic-link | 8 h |

### Formato de respuesta

```json
// Éxito
{ "ok": true, "data": { ... } }
// Error
{ "ok": false, "message": "Descripción del error" }
```

### Códigos de estado HTTP

| Código | Significado |
|---|---|
| 200 / 201 | OK / Recurso creado |
| 400 | Validación de entrada fallida |
| 401 | No autenticado / credenciales inválidas / token expirado |
| 403 | Autenticado pero sin permiso para el recurso |
| 404 | Recurso no encontrado |
| 409 | Conflicto (p. ej., email ya registrado) |
| 422 | Regla de negocio (p. ej., franja ya ocupada) |
| 429 | Rate limit excedido |
| 500 | Error interno |

### Rate limits (por IP)

- **Global** en todas las rutas `/api/`: 60 peticiones / 15 min.
- `authLimiter` (login admin, owners, credenciales de cliente): 10 / 15 min.
- `otpLimiter` (OTP y magic-link): 30 / 15 min.
- `refreshLimiter` (`POST /api/auth/refresh`): 60 / 15 min.
- Login por PIN de negocio: límite estricto anti fuerza bruta.

---

## Renovación de sesión

### `POST /api/auth/refresh`

Re-emite un token de acceso sin pedir credenciales de nuevo. Estrategia de "deslizamiento": se admite un token **aún válido o expirado dentro de la ventana de gracia** (`REFRESH_GRACE`, horas, defecto 6). Se valida la firma (HS256), se conserva el rol y la identidad (`ownerId`/`businessId`/`customerId`), y se re-firma con expiración completa (admin 2 h, resto 8 h).

**Request**

```json
{ "token": "<token_actual_o_recientemente_expirado>" }
```

**Respuestas**

- `200` → `{ "ok": true, "data": { "token": "<nuevo_token>" } }`
- `401` → token inválido, rol desconocido, o exponería fuera de la ventana de gracia ("Sesión expirada; vuelve a iniciar sesión").

**Uso en el frontend**: `AuthService.refreshSession()` renueva la sesión activa (admin/owner/customer); `AppComponent` lo dispara a los 5 s del arranque y luego cada hora.

---

## Auth

### `POST /api/auth/admin`

Autentica el administrador global con el PIN (se compara contra el hash bcrypt derivado de `ADMIN_PIN`, o directamente contra `ADMIN_PIN_HASH`).

```json
// Request
{ "pin": "9876" }
// Response 200
{ "ok": true, "data": { "token": "<jwt admin, 2h>" } }
```

### `POST /api/auth/owner/register`

```json
{ "name": "Ana", "email": "ana@correo.com", "password": "123456" }
// 201
{ "ok": true, "data": { "token": "<jwt owner, 8h>", "owner": { "id": "...", "name": "Ana", "email": "ana@correo.com" } } }
```

Errores: `409` si el email ya existe.

### `POST /api/auth/owner/login`

```json
{ "email": "ana@correo.com", "password": "123456" }
// 200 — mismo shape que register
```

### `GET /api/auth/owner/me`

Requiere **owner**. Devuelve `{ id, name, email, created_at }`.

### `POST /api/auth/customer/login`

Login de cliente sin contraseña por email (+ teléfono si lo registró).

```json
{ "email": "cliente@correo.com", "phone": "+34600111222" }
// 200
{ "ok": true, "data": { "token": "<jwt customer, 8h>", "customer": { "id": "...", "name": "...", "email": "...", "phone": "..." } } }
```

### `POST /api/auth/customer/otp/request`

Solicita un código OTP (6 dígitos, TTL 10 min, máx. 5 intentos, one-time) por email/SMS.

```json
{ "email": "cliente@correo.com" }
```

Respuesta genérica (no revela si el email existe). Con `OTP_DEBUG=1` (solo dev/test) incluye `debugCode`/`debugToken`.

### `POST /api/auth/customer/otp/verify`

```json
{ "email": "cliente@correo.com", "code": "123456" }
// 200
{ "ok": true, "data": { "token": "<jwt customer, 8h>", "customer": { ... } } }
```

Errores: `400` código inválido, `410` expirado/agotado.

### `POST /api/auth/customer/magic-link/request`

Envía un email con `<FRONTEND_URL>/customer/verify?token=<token>` (TTL 15 min, one-time).

```json
{ "email": "cliente@correo.com" }
```

### `POST /api/auth/customer/magic-link/verify`

```json
{ "token": "<token del email>" }
// 200 — mismo shape que otp/verify
```

---

## Negocios

### `GET /api/businesses`

Listado público de negocios activos. Opcional `?category=` y `?tag=` para filtrar. Cada negocio incluye `cantidadReservasHoy`/`cantidadReservasTotales`, `verified`, `cancellationPolicy`, redes sociales, etc.

### `GET /api/businesses/all`

Requiere **admin**. Listado completo (incluye inactivos).

### `GET /api/businesses/owner`

Requiere **owner**. Negocios del dueño logueado.

### `POST /api/businesses`

Requiere **admin** u **owner**. Crea un negocio.

```json
{
  "name": "Cancha Central", "category": "Deportes", "pin": "5678",
  "description": "...", "location": "...", "phone": "...", "schedule": "...",
  "tags": "cancha,tenis", "rating": 4.5, "reviews": 12, "cancellationPolicy": "..."
}
```

`pin` obligatorio en el alta; se almacena como hash bcrypt.

### `POST /api/businesses/:id/auth`

Login por PIN del negocio.

```json
{ "pin": "5678" }
// 200
{ "ok": true, "data": { "token": "<jwt business-admin, 8h>", "business": { ... } } }
```

### `GET /api/businesses/:id`

Requiere **business-admin**. Detalle completo del negocio.

### `GET /api/businesses/:id/availability`

Público. Devuelve las franjas disponibles (`disponibilidad = 'Disponible'`) del negocio para reservar.

### `PUT /api/businesses/:id`

Requiere **business-admin**. Actualiza campos del negocio (todos opcionales; `pin` opcional para cambiarlo).

### `PATCH /api/businesses/:id/toggle`

Requiere **admin**. Activa/desactiva el negocio (`{ "active": true|false }`).

### `PATCH /api/businesses/:id/verify`

Requiere **admin**. Marca el negocio como verificado (`{ "verified": true }`).

### `DELETE /api/businesses/:id`

Requiere **admin**. Elimina el negocio (servicios, reservaciones, bookings, pagos y ratings en cascada).

### `GET /api/businesses/:id/reservations`

Requiere **business-admin**. Franjas y reservaciones del negocio.

### `POST /api/businesses/:id/reservations`

Público (creación de franja reservada). Crea/actualiza una reservación:

```json
{ "franja": "10:00", "cliente": "Juan", "telefono": "600111222", "servicio": "Corte", "notas": "" }
```

### `PUT /api/businesses/:id/reservations/:row`

Requiere **business-admin**. Cambia estado/notas de una franja:

```json
{ "disponibilidad": "Confirmado", "notas": "..." }
```

Estados permitidos: `Disponible | Pendiente | Reservado | Confirmado | Cancelado`.

### `POST /api/businesses/:id/checkout`

Registra una reserva en el checkout del negocio (crea `booking` + `payment`):

```json
{
  "franja": "10:00", "cliente": "Juan", "telefono": "600111222",
  "servicio": "Corte", "notas": "", "email": "juan@correo.com",
  "amount": 20, "currency": "EUR", "method": "card"
}
```

### `GET /api/businesses/:id/services`

Público. Lista de servicios (nombres) del negocio. En el panel incluye precio/duración si están configurados.

### `POST /api/businesses/:id/services`

Requiere **business-admin**. Crea un servicio:

```json
{ "nombre": "Corte de cabello" }
```

### `DELETE /api/businesses/:id/services/:nombre`

Requiere **business-admin**. Elimina el servicio (codifica el nombre en la URL).

---

## Clientes

### `GET /api/customers`

Requiere **admin**. Listado de clientes.

Parámetros opcionales: `page` y `pageSize` (máx 200, default 25). Si se pasan, la respuesta incluye `meta: { total, page, pageSize }` y `data` es la página correspondiente; sin ellos se devuelve el listado completo como hasta ahora.

### `POST /api/customers`

Público. Alta de cliente (se usa en el checkout):

```json
{ "name": "Juan", "email": "juan@correo.com", "phone": "600111222" }
```

### `GET /api/customers/email/:email`

Público. Busca un cliente por email.

### `GET /api/customers/me`

Requiere **customer**. Perfil del cliente logueado.

### `GET /api/customers/:id/history`

Requiere **customer** (solo el propio `id`; otro id → `403`). Historial de reservas y pagos del cliente.

Soporta paginación opcional con `page`/`pageSize`; cuando se usa, añade `meta: { total, page, pageSize }` a la respuesta `{ customer, bookings }`.

---

## Marketplace — bookings, pagos y notificaciones

### `GET /api/bookings`

Requiere **admin**. Lista todas las reservas del marketplace.

Parámetros opcionales: `page`/`pageSize` (máx 200, default 25); con ellos la respuesta incluye `meta: { total, page, pageSize }`.

### `POST /api/bookings`

Público. Crea una reserva:

```json
{
  "providerId": "cancha_abc_1abc2",
  "customerId": "c_...",
  "serviceId": "nombre-o-id-del-servicio",
  "date": "2026-10-05",
  "slot": "10:00",
  "notes": ""
}
```

### `GET /api/payments`

Requiere **admin**. Listado de pagos. Filtros opcionales por query (`providerId`). Paginación opcional con `page`/`pageSize` (máx 200, default 25) → añade `meta: { total, page, pageSize }`.

### `POST /api/payments`

Público. Registra un pago:

```json
{
  "bookingId": "...", "providerId": "...", "customerId": "...",
  "amount": 20, "currency": "EUR", "method": "card", "status": "pending"
}
```

Métodos: `card | paypal | transfer | cash`.

### `POST /api/payments/checkout`

Público. Crea una sesión de checkout (mismos campos + `successUrl`/`cancelUrl` opcionales).

### `POST /api/payments/webhook`

Public. Webhook de la pasarela — verifica la firma `stripe-signature` antes de procesar el evento y actualiza el estado del pago. El body llega como `raw` (se monta con `express.raw` en esta ruta).

### `PATCH /api/payments/:id`

Requiere **auth**. Actualiza el estado (`pending | paid | failed | refunded`). Solo accesible al negocio/rol dueño del pago (`canAccessBusinessId`).

### `GET /api/notifications?businessId=&bookingId=`

Público (con o sin filtro). Lista de avisos internos.

### `POST /api/notifications`

Crea un aviso:

```json
{ "businessId": "...", "title": "Nueva reserva", "message": "...", "type": "booking_created", "channel": "in_app" }
```

### `POST /api/notifications/reminder`

Dispara un recordatorio (email/SMS) a partir del aviso indicado en el body.

> **Recordatorios agendados**: el worker interno (`backend/src/services/reminders.worker.js`) dispara este recordatorio de forma automática para cada reserva dentro de la ventana `REMINDER_WINDOW_HOURS` (defecto 24 h) que no tenga ya un recordatorio en `queued/sent`. Se activa con `ENABLE_REMINDER_WORKER=1` e itera cada `REMINDER_INTERVAL_MINUTES` (defecto 60).

---

## Ratings, categorías, tags y UX

### `GET /api/ratings/:businessId`

Valoraciones de un negocio.

### `GET /api/ratings/:businessId/average`

Media de valoraciones `{ average, count }`.

### `POST /api/ratings/:businessId`

Rating de un negocio (limitado por IP):

```json
{ "rating": 5, "review": "Muy buen servicio" }
```

### `GET /api/categories` · `GET /api/categories/all`

Lista de categorías. `all` se usa para prellenar filtros en el panel.

### `GET /api/tags/all`

Lista de etiquetas.

### `GET /api/ux-tips`

Sugerencias de UX mostradas en los paneles.

---

## Google Sheets (OAuth)

Requieren cualquier token (`requireAnyAuth`): `start`, `callback`, `status`, `disconnect`, `create-sheet`, `link-sheet`, `sync`. El flujo está pensado para vincular un negocio (`:businessId`) a una hoja de cálculo y sincronizar reservas/servicios.

---

## Panel de administración global

Todos requieren **admin**:

| Endpoint | Descripción |
|---|---|
| `GET /api/admin/stats` | Métricas globales |
| `GET /api/admin/payments` | Pagos del sistema |
| `GET /api/admin/reviews` · `DELETE /api/admin/reviews/:id` | Moderación de reseñas |
| `GET /api/admin/services` · `DELETE /api/admin/services/:serviceId` | Moderación de servicios |

---

## Rutas legacy

Compatibilidad con el cliente anterior. Prefijo `/api`:

| Endpoint | Notas |
|---|---|
| `GET /api/reservations?businessId=` | Lista de reservaciones (requiere auth) |
| `POST /api/reservations` | Crea una reservación |
| `PUT /api/reservations/:id` | Actualiza franja/estado (requiere auth) |
| `GET /api/services?businessId=` · `POST /api/services` (auth) · `DELETE /api/services/:nombre` (auth) | Servicios legacy |
| `GET /api/providers...` | Alias de `/api/businesses` (mismo router) |

---

## Salud y métricas

### `GET /health`

```json
{ "ok": true, "status": "healthy", "database": "connected", ... }
```

### `GET /metrics`

Uptime, nº de requests, errores del proceso, desglose por status code, uso de memoria y versión de Node.