# Guía para desarrolladores — Reservorio

Esta guía cubre la arquitectura interna del proyecto, las convenciones de desarrollo, el flujo de datos entre capas y el listado de mejoras pendientes.

---

## Tabla de contenidos

1. [Arquitectura general](#1-arquitectura-general)
2. [Backend — Express + PostgreSQL](#2-backend--express--postgresql)
3. [Frontend — Angular 17](#3-frontend--angular-17)
4. [Flujo de autenticación](#4-flujo-de-autenticación)
5. [Convenciones de código](#5-convenciones-de-código)
6. [Agregar un nuevo negocio manualmente (SQL)](#6-agregar-un-nuevo-negocio-manualmente-sql)
7. [Variables de entorno de referencia](#7-variables-de-entorno-de-referencia)
8. [Mejoras pendientes](#8-mejoras-pendientes)

---

## 1. Arquitectura general

```
Navegador
    │
    ▼
┌─────────────────────────────────────────┐
│  Frontend  (Angular 17 + Tailwind CSS)  │
│  Servido por Nginx en el puerto 80      │
│  Nginx proxea /api/* → backend:3000     │
└──────────────┬──────────────────────────┘
               │ HTTP / JSON
               ▼
┌──────────────────────────────────────────┐
│  Backend  (Node.js + Express 5)          │
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
├── index.js              # Bootstrap: middlewares globales, rutas, arranque
├── db.js                 # Pool pg reutilizable (singleton)
├── middleware/
│   ├── jwt.js            # sign() y verify() — wrapper sobre jsonwebtoken
│   └── sanitize.js       # clean(), isValidPhone(), validateReservation(), validateUpdate()
└── routes/
    ├── auth.routes.js          # POST /api/auth/admin
    ├── businesses.routes.js    # Toda la lógica de negocios, reservaciones y servicios
    ├── reservations.routes.js  # Rutas legacy /api/reservations
    └── services.routes.js      # Rutas legacy /api/services
```

### Pool de conexión (`db.js`)

Se exporta un único `Pool` de `pg`. Todos los archivos de rutas lo importan directamente:

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

Los tokens se generan con `sign(payload)` y tienen una expiración de **8 horas**. El payload incluye:

```json
// Token admin global
{ "role": "admin" }

// Token administrador de negocio
{ "role": "business-admin", "businessId": "cancha_abc_1abc2" }
```

`JWT_SECRET` debe configurarse en `.env`. Si no está definido, se usa un secreto hardcodeado de desarrollo y se imprime una advertencia en consola.

### Schema de la base de datos

```sql
businesses
  id          TEXT PK
  name        TEXT
  category    TEXT
  description TEXT
  location    TEXT
  rating      NUMERIC(4,2)
  reviews     INT
  tags        TEXT          -- valores separados por coma
  gradient    TEXT
  icon        TEXT
  schedule    TEXT
  logo        TEXT
  phone       TEXT
  active      BOOLEAN
  pin_hash    TEXT          -- bcrypt hash, cost factor 10
  created_at  TIMESTAMPTZ

services
  id          SERIAL PK
  business_id TEXT FK → businesses(id) ON DELETE CASCADE
  nombre      TEXT
  created_at  TIMESTAMPTZ
  UNIQUE(business_id, nombre)

reservations
  id              SERIAL PK
  business_id     TEXT FK → businesses(id) ON DELETE CASCADE
  franja          TEXT
  disponibilidad  TEXT      -- Disponible | Pendiente | Reservado | Confirmado
  cliente         TEXT
  telefono        TEXT
  servicio        TEXT
  notas           TEXT
  created_at      TIMESTAMPTZ
  updated_at      TIMESTAMPTZ
```

---

## 3. Frontend — Angular 17

### Versión y características usadas

- Angular **17.3** con Standalone Components (sin NgModules)
- Signals (`signal`, `computed`) para estado reactivo en servicios
- Lazy loading en todas las rutas con `loadComponent`
- Tailwind CSS 3 + `@tailwindcss/forms`
- GSAP 3 para animaciones

### Estructura de carpetas

```
src/app/
├── app.component.{ts,html,css}   # Shell raíz — incluye el <router-outlet> y el ToastComponent
├── app.config.ts                  # provideRouter + provideHttpClient
├── app.routes.ts                  # Definición de rutas con lazy loading
├── core/
│   ├── guards/
│   │   ├── admin.guard.ts         # Redirige a /login si no hay token admin válido
│   │   └── business.guard.ts      # Redirige a /business/:id/login si no hay token del negocio
│   ├── models/
│   │   └── reservation.model.ts   # Interfaces: Business, Reservation, BookingPayload, etc.
│   └── services/
│       ├── api.service.ts         # Todas las llamadas HTTP al backend
│       ├── auth.service.ts        # Gestión de tokens JWT en sessionStorage
│       └── toast.service.ts       # Sistema de notificaciones con Signals
└── features/
    ├── home/                      # Listado público de negocios
    ├── booking/                   # Formulario de reserva para clientes
    ├── login/                     # Login del administrador global
    ├── admin/                     # Panel global: CRUD de negocios
    ├── business-login/            # Login del administrador de negocio
    └── business-admin/            # Panel: reservaciones y servicios del negocio
```

### Rutas del frontend

| Ruta | Componente | Guard |
|---|---|---|
| `/` | `HomeComponent` | — |
| `/booking/:businessId` | `BookingComponent` | — |
| `/login` | `LoginComponent` | — |
| `/admin` | `AdminComponent` | `adminGuard` |
| `/business/:businessId/login` | `BusinessLoginComponent` | — |
| `/business/:businessId/admin` | `BusinessAdminComponent` | `businessGuard` |

### `AuthService` — almacenamiento de tokens

Los tokens se guardan en `sessionStorage` (se borran al cerrar la pestaña):

| Clave | Contenido |
|---|---|
| `reservorio_admin_jwt` | JWT del administrador global |
| `biz_jwt_<businessId>` | JWT del administrador de cada negocio |
| `reservorio_unlocked` | Flag legacy de sesión (`"1"`) |
| `reservorio_admin_pin` | PIN legacy en `localStorage` (versión anterior) |

El método `isTokenValid()` decodifica el payload del JWT en el cliente y compara el campo `exp` con `Date.now()` para detectar tokens expirados sin necesidad de llamar al backend.

### `ApiService` — comunicación con el backend

Todas las peticiones HTTP pasan por `ApiService`. Los errores se transforman con `handleError()` que extrae el mensaje del cuerpo de la respuesta antes de lanzar un `throwError`.

---

## 4. Flujo de autenticación

### Administrador global

```
POST /api/auth/admin  {pin}
    → backend verifica contra ADMIN_PIN en .env
    → devuelve JWT con role: "admin"
    → frontend guarda token en sessionStorage (clave: reservorio_admin_jwt)
    → adminGuard permite acceso a /admin
```

### Administrador de negocio

```
POST /api/businesses/:id/auth  {pin}
    → backend consulta businesses WHERE id = $1
    → bcrypt.compare(pin, pin_hash)
    → devuelve JWT con role: "business-admin", businessId
    → frontend guarda token en sessionStorage (clave: biz_jwt_<id>)
    → businessGuard permite acceso a /business/:id/admin
```

---

## 5. Convenciones de código

### Backend

- `'use strict'` al inicio de todos los archivos.
- Importaciones con `require`, CommonJS (`"type": "commonjs"` en `package.json`).
- Manejo de errores en rutas: siempre con `try/catch`, respuesta `500` con `e.message`.
- Queries paramétrizadas: **siempre** usar `$1`, `$2`... Nunca concatenar strings con datos de usuario.
- Sanitizar toda entrada externa con `clean()` antes de insertar en la BD.

### Frontend

- Standalone components — no usar `NgModule`.
- Usar `inject()` en lugar del constructor para dependencias.
- Estado reactivo con Signals — no usar `BehaviorSubject` para estado local de componentes.
- Nombres de archivo: `kebab-case.component.ts`.
- Interfaces de datos en `core/models/reservation.model.ts`.

---

## 6. Agregar un nuevo negocio manualmente (SQL)

Si necesitas insertar un negocio directamente en la base de datos (por ejemplo, para pruebas o migración de datos), puedes conectarte al contenedor:

```bash
docker exec -it reservorio-db psql -U reservorio -d reservorio
```

Para hashear un PIN antes de insertarlo, usa el endpoint de la API:

```bash
# O genera el hash con Node.js:
node -e "const b = require('bcryptjs'); b.hash('1234', 10).then(console.log)"
```

Luego inserta el negocio:

```sql
INSERT INTO businesses (id, name, category, pin_hash, active)
VALUES ('mi_negocio_1abc2', 'Mi Negocio', 'Salud', '$2a$10$...hash...', true);
```

---

## 7. Variables de entorno de referencia

Crea `backend/.env` con el siguiente contenido como punto de partida:

```env
# Base de datos
DATABASE_URL=postgres://reservorio:reservorio_pass@localhost:5432/reservorio

# JWT — cambiar a una cadena aleatoria larga en producción
JWT_SECRET=cambia_esto_por_un_secreto_seguro

# PIN del panel de administración global
ADMIN_PIN=1234

# Puerto del servidor (opcional, defecto: 3000)
PORT=3000

# Orígenes permitidos por CORS (opcional, defecto: http://localhost:4200)
CORS_ORIGINS=http://localhost,http://localhost:4200
```

---

## 8. Mejoras pendientes

Las siguientes mejoras están identificadas pero aún no implementadas, ordenadas por prioridad estimada.

### Alta prioridad

- [ ] **Tests del backend** — No existe ningún test automatizado. Agregar tests de integración con [Jest](https://jestjs.io/) + [supertest](https://github.com/ladjs/supertest) para las rutas principales (`/businesses`, `/reservations`, `/auth`).
- [ ] **Tests del frontend** — Los test runners de Karma/Jasmine están configurados pero los specs están vacíos. Cubrir al menos `AuthService` y `ApiService`.
- [ ] **Migración de schema con versiones** — El archivo `init.sql` solo corre en contenedores nuevos. Agregar una herramienta de migraciones (p. ej., [node-pg-migrate](https://github.com/salsita/node-pg-migrate)) para gestionar cambios al schema en producción sin perder datos.
- [ ] **Refresh de tokens JWT** — Actualmente los tokens expiran a las 8 horas y el usuario debe volver a loguearse manualmente. Implementar un endpoint `POST /api/auth/refresh` y lógica en el frontend para renovarlos automáticamente antes de que expiren.
- [ ] **Variables de entorno en el frontend** — La `apiUrl` en `environment.ts` está hardcodeada a `http://localhost:3000/api`. Parametrizar mediante `build` de Angular con variables de entorno para facilitar distintos ambientes (dev, staging, producción).

### Media prioridad

- [ ] **Gestión de franjas horarias desde el panel** — Actualmente las franjas con estado `Disponible` deben crearse manualmente en la BD. Agregar un CRUD de franjas desde `BusinessAdminComponent` que permita generar horarios recurrentes (p. ej., cada 1 hora de 8:00 a 22:00).
- [ ] **Paginación en listados** — Los endpoints de reservaciones devuelven todos los registros sin límite. Agregar paginación (`LIMIT` / `OFFSET`) en `GET /api/businesses/:id/reservations` y en el frontend.
- [ ] **Imagen de producción sin `devDependencies`** — El `Dockerfile` del backend usa `npm ci --omit=dev`, lo cual es correcto, pero no hay stage de build separado. Agregar un multi-stage build para reducir el tamaño de la imagen.
- [ ] **Logging estructurado** — Reemplazar los `console.error` y `console.warn` del backend por una biblioteca de logging estructurado (p. ej., [pino](https://github.com/pinojs/pino)) para mejorar la observabilidad en producción.
- [ ] **Health check con estado de la BD** — El endpoint `/health` solo verifica que Express responde. Incluir una query liviana a PostgreSQL (`SELECT 1`) para confirmar que la BD está accesible.
- [ ] **Soft-delete en reservaciones** — Actualmente no hay forma de eliminar una reservación; solo se cambia su estado. Agregar una columna `deleted_at` y filtrarla en las consultas de lectura.

### Baja prioridad / mejoras de UX y operaciones

- [ ] **Eliminación de negocios** — No existe endpoint `DELETE /api/businesses/:id`. Al eliminar un negocio se deben eliminar en cascada sus servicios y reservaciones (ya configurado en la FK, solo falta la ruta y la UI).
- [ ] **Exportar reservaciones a CSV** — Agregar un botón en `BusinessAdminComponent` para descargar las reservaciones del día/semana en formato CSV.
- [ ] **Notificaciones por email o WhatsApp** — Integrar un servicio externo (Resend, Twilio) para notificar al cliente cuando su reserva es confirmada o cancelada.
- [ ] **Internacionalización (i18n)** — El texto de la interfaz está en español hardcodeado. Agregar soporte `@angular/localize` si se necesita operar en múltiples idiomas.
- [ ] **PIN de admin con hash** — El `ADMIN_PIN` en `.env` se compara en texto plano en `auth.routes.js`. Migrar a comparación con bcrypt, igual que los PINs de negocios.
- [ ] **Modo oscuro** — La UI de Tailwind no tiene soporte para `dark:` aún activado. Agregar `darkMode: 'class'` en `tailwind.config.js` y los estilos correspondientes.
- [ ] **`legacy/` como carpeta de archivo** — El directorio `legacy/` contiene la versión HTML/JS original. Moverlo a una rama `git` separada o eliminarlo del árbol principal para mantener el repositorio limpio.
