# Referencia de la API — Reservorio

Base URL en desarrollo: `http://localhost:3000/api`  
Base URL en producción (Docker): `/api`

---

## Convenciones

### Autenticación

Los endpoints protegidos requieren un token JWT en la cabecera `Authorization`:

```
Authorization: Bearer <token>
```

Hay dos roles de token:

| Rol | Cómo se obtiene | Acceso |
|---|---|---|
| `admin` | `POST /api/auth/admin` | Panel global: todos los negocios |
| `business-admin` | `POST /api/businesses/:id/auth` | Solo su propio negocio |

### Formato de respuesta

Todas las respuestas siguen esta estructura:

```json
{
  "ok": true,
  "data": { }
}
```

En caso de error:

```json
{
  "ok": false,
  "message": "Descripción del error"
}
```

O para errores de validación con múltiples campos:

```json
{
  "ok": false,
  "errors": ["franja es obligatorio", "telefono inválido"]
}
```

### Códigos de estado HTTP

| Código | Significado |
|---|---|
| `200` | OK |
| `201` | Recurso creado |
| `400` | Solicitud inválida (datos faltantes o incorrectos) |
| `401` | No autenticado (token faltante o expirado) |
| `403` | Sin permiso para acceder al recurso |
| `404` | Recurso no encontrado |
| `409` | Conflicto (p. ej., franja ya reservada, servicio ya existe) |
| `500` | Error interno del servidor |

---

## Auth

### `POST /api/auth/admin`

Obtiene un token JWT con rol `admin`.

**Autenticación requerida:** No

**Cuerpo de la solicitud:**

```json
{
  "pin": "1234"
}
```

**Respuesta exitosa `200`:**

```json
{
  "ok": true,
  "data": {
    "token": "eyJhbGci..."
  }
}
```

**Errores:**

| Código | Motivo |
|---|---|
| `400` | `pin` no enviado |
| `401` | PIN incorrecto |

---

## Negocios

### `GET /api/businesses`

Lista todos los negocios **activos**. Respuesta pública, no requiere autenticación.

**Autenticación requerida:** No

**Respuesta exitosa `200`:**

```json
{
  "ok": true,
  "data": [
    {
      "id": "cancha_abc_1abc2",
      "name": "Cancha El Prado",
      "category": "Deportes",
      "description": "Cancha de fútbol 5 techada",
      "location": "Av. Siempre Viva 123",
      "rating": 4.8,
      "reviews": 42,
      "tags": ["fútbol", "techada"],
      "gradient": "linear-gradient(135deg,#005bbf,#1a73e8)",
      "icon": "sports_soccer",
      "schedule": "Lunes a Domingo 8:00–22:00",
      "logo": "",
      "phone": "+54 9 11 1234-5678",
      "active": true,
      "available": 0,
      "total": 0,
      "routePath": "/booking/cancha_abc_1abc2"
    }
  ]
}
```

---

### `GET /api/businesses/all`

Lista **todos** los negocios (incluyendo inactivos). Solo para administradores globales.

**Autenticación requerida:** Sí — rol `admin`

**Respuesta exitosa `200`:** Igual que `GET /api/businesses` pero incluye negocios con `active: false`.

---

### `POST /api/businesses/:id/auth`

Inicia sesión como administrador de un negocio específico usando su PIN.

**Autenticación requerida:** No

**Parámetros de ruta:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `id` | string | ID del negocio |

**Cuerpo de la solicitud:**

```json
{
  "pin": "5678"
}
```

**Respuesta exitosa `200`:**

```json
{
  "ok": true,
  "data": {
    "token": "eyJhbGci...",
    "business": { }
  }
}
```

**Errores:**

| Código | Motivo |
|---|---|
| `400` | `pin` no enviado |
| `401` | PIN incorrecto |
| `404` | Negocio no encontrado |
| `503` | El negocio no tiene PIN configurado |

---

### `POST /api/businesses`

Crea un nuevo negocio.

**Autenticación requerida:** Sí — rol `admin`

**Cuerpo de la solicitud:**

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `name` | string | Sí | Nombre del negocio |
| `category` | string | Sí | Categoría (p. ej., "Deportes", "Salud") |
| `pin` | string | Sí | PIN de acceso para el administrador del negocio |
| `description` | string | No | Descripción breve |
| `location` | string | No | Dirección o ubicación |
| `rating` | number | No | Puntuación inicial (defecto: `5.0`) |
| `reviews` | number | No | Número inicial de reseñas (defecto: `0`) |
| `tags` | string[] \| string | No | Etiquetas separadas por coma o array |
| `gradient` | string | No | CSS gradient para la tarjeta |
| `icon` | string | No | Nombre de ícono Material (defecto: `"store"`) |
| `schedule` | string | No | Horario de atención |
| `logo` | string | No | URL del logo |
| `phone` | string | No | Teléfono de contacto |

**Respuesta exitosa `201`:**

```json
{
  "ok": true,
  "data": { }
}
```

---

### `PUT /api/businesses/:id`

Actualiza los datos de un negocio. Solo se modifican los campos enviados.

**Autenticación requerida:** Sí — rol `admin` o `business-admin` dueño del negocio

**Parámetros de ruta:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `id` | string | ID del negocio |

**Cuerpo de la solicitud:** Cualquier subconjunto de los campos de `POST /api/businesses` (excepto que `name`, `category` y `pin` son opcionales aquí).

**Respuesta exitosa `200`:**

```json
{
  "ok": true,
  "data": { }
}
```

---

### `PATCH /api/businesses/:id/toggle`

Activa o desactiva un negocio (invierte el valor de `active`).

**Autenticación requerida:** Sí — rol `admin`

**Parámetros de ruta:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `id` | string | ID del negocio |

**Respuesta exitosa `200`:**

```json
{
  "ok": true,
  "data": { "active": false }
}
```

---

## Reservaciones por negocio

### `GET /api/businesses/:id/reservations`

Lista todas las reservaciones de un negocio.

**Autenticación requerida:** No

**Parámetros de ruta:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `id` | string | ID del negocio |

**Respuesta exitosa `200`:**

```json
{
  "ok": true,
  "data": [
    {
      "id": 1,
      "business_id": "cancha_abc_1abc2",
      "franja": "10:00–11:00",
      "disponibilidad": "Reservado",
      "cliente": "Juan Pérez",
      "telefono": "+54 9 11 1234-5678",
      "servicio": "Cancha Fútbol 5",
      "notas": "",
      "created_at": "2026-04-07T10:00:00.000Z",
      "updated_at": "2026-04-07T10:00:00.000Z"
    }
  ]
}
```

---

### `POST /api/businesses/:id/reservations`

Crea una nueva reservación en un negocio. Verifica que la franja no esté ya ocupada.

**Autenticación requerida:** No

**Parámetros de ruta:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `id` | string | ID del negocio |

**Cuerpo de la solicitud:**

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `franja` | string | Sí | Ej: `"10:00–11:00"` |
| `cliente` | string | Sí | Nombre del cliente |
| `telefono` | string | Sí | Teléfono (7–15 dígitos, puede incluir `+`, espacios y guiones) |
| `servicio` | string | No | Nombre del servicio seleccionado |
| `notas` | string | No | Observaciones adicionales |

**Respuesta exitosa `201`:**

```json
{
  "ok": true,
  "data": { }
}
```

**Errores:**

| Código | Motivo |
|---|---|
| `400` | Campos requeridos faltantes o teléfono con formato inválido |
| `404` | Negocio no encontrado o inactivo |
| `409` | La franja ya está reservada |

---

### `PUT /api/businesses/:id/reservations/:row`

Actualiza el estado de una reservación (confirmar, cancelar, etc.).

**Autenticación requerida:** Sí — rol `admin` o `business-admin` dueño del negocio

**Parámetros de ruta:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `id` | string | ID del negocio |
| `row` | number | ID de la reservación |

**Cuerpo de la solicitud:**

| Campo | Tipo | Requerido | Valores permitidos |
|---|---|---|---|
| `disponibilidad` | string | Sí | `Disponible`, `Pendiente`, `Reservado`, `Confirmado` |
| `notas` | string | No | Texto libre |

**Respuesta exitosa `200`:**

```json
{
  "ok": true,
  "data": { }
}
```

---

## Servicios por negocio

### `GET /api/businesses/:id/services`

Lista los servicios de un negocio.

**Autenticación requerida:** No

**Respuesta exitosa `200`:**

```json
{
  "ok": true,
  "data": ["Cancha Fútbol 5", "Cancha Fútbol 7", "Arquería"]
}
```

---

### `POST /api/businesses/:id/services`

Agrega un nuevo servicio a un negocio.

**Autenticación requerida:** Sí — rol `admin` o `business-admin` dueño del negocio

**Cuerpo de la solicitud:**

```json
{
  "nombre": "Nuevo Servicio"
}
```

**Respuesta exitosa `201`:**

```json
{
  "ok": true,
  "data": { "nombre": "Nuevo Servicio" }
}
```

**Errores:**

| Código | Motivo |
|---|---|
| `400` | `nombre` no enviado o supera 100 caracteres |
| `409` | El servicio ya existe en este negocio |

---

### `DELETE /api/businesses/:id/services/:nombre`

Elimina un servicio de un negocio.

**Autenticación requerida:** Sí — rol `admin` o `business-admin` dueño del negocio

**Parámetros de ruta:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `id` | string | ID del negocio |
| `nombre` | string | Nombre del servicio, URL-encoded |

**Respuesta exitosa `200`:**

```json
{ "ok": true }
```

---

## Rutas legacy

Estas rutas existen por compatibilidad con la versión anterior del sistema que usaba una sola hoja de cálculo. Para nuevos desarrollos se recomienda usar las rutas `/api/businesses/:id/...`.

### `GET /api/reservations?businessId=<id>`

Equivalente a `GET /api/businesses/:id/reservations`.

### `POST /api/reservations`

Equivalente a `POST /api/businesses/:id/reservations`. El cuerpo debe incluir el campo `businessId`.

### `PUT /api/reservations/:id`

Equivalente a `PUT /api/businesses/:id/reservations/:row`.

### `GET /api/services?businessId=<id>`

Equivalente a `GET /api/businesses/:id/services`.

### `POST /api/services`

Equivalente a `POST /api/businesses/:id/services`. El cuerpo debe incluir el campo `businessId`.

### `DELETE /api/services/:nombre?businessId=<id>`

Equivalente a `DELETE /api/businesses/:id/services/:nombre`.

---

## Health check

### `GET /health`

Verifica que el servidor esté corriendo. No forma parte del prefijo `/api`.

**Respuesta `200`:**

```json
{ "ok": true, "service": "reservorio-api" }
```
