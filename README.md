# Reservorio

Sistema de reservas multi-negocio. Permite a clientes consultar disponibilidad y reservar franjas horarias en negocios como canchas deportivas, salones de belleza, consultorios y similares. Los administradores de cada negocio gestionan sus reservaciones y servicios desde un panel propio.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Angular 22 + Tailwind CSS, servido con Nginx |
| Backend | Node.js 22 + Express |
| Base de datos | PostgreSQL 16 |
| Infraestructura | Docker + Docker Compose |
| Autenticación | JWT (jsonwebtoken) + bcrypt |
| Gestor de paquetes | pnpm 9 |

---

## Requisitos previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (incluye Docker Compose)
- Git

Para desarrollo local sin Docker se necesita adicionalmente Node.js 22.22.3 y una instancia de PostgreSQL.

Se recomienda usar `nvm` o `fnm` para fijar la versión con los archivos `.nvmrc` y `.node-version` del repositorio.

---

## Inicio rápido

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd Reservorio
```

### 2. Instalar dependencias del entorno local

```bash
corepack enable
pnpm install
```

En cada proyecto:

```bash
cd backend
pnpm install

cd ../frontend
pnpm install
```

### 3. Crear el archivo de variables de entorno

```bash
cp backend/.env.example backend/.env
```

Edita `backend/.env` y configura los valores descritos en la siguiente sección.

### 4. Levantar los servicios

```bash
docker compose up --build
```

La primera vez Docker descargará las imágenes, instalará dependencias y ejecutará el schema SQL automáticamente. Al terminar:

| Servicio | URL |
|---|---|
| Frontend (app) | http://localhost |
| API REST | http://localhost:3000/api |
| PostgreSQL | localhost:5432 |

Para detener todos los servicios:

```bash
docker compose down
```

Para detener y **eliminar los datos** (volumen de la base de datos):

```bash
docker compose down -v
```

---

## Variables de entorno

El backend lee su configuración desde `backend/.env`. Crea ese archivo basándote en la siguiente tabla:

| Variable | Requerida | Descripción | Ejemplo |
|---|---|---|---|
| `DATABASE_URL` | Sí | Cadena de conexión a PostgreSQL | `postgres://reservorio:reservorio_pass@localhost:5432/reservorio` |
| `JWT_SECRET` | Sí | Clave secreta para firmar tokens JWT. Usa una cadena larga y aleatoria en producción. | `mi_clave_super_secreta_2026` |
| `ADMIN_PIN` | No | PIN numérico para el panel de administración global. Por defecto: `1234`. | `9876` |
| `PORT` | No | Puerto en que escucha el backend. Por defecto: `3000`. | `3000` |
| `CORS_ORIGINS` | No | Orígenes permitidos por CORS, separados por coma. | `http://localhost,https://midominio.com` |

> **Nota:** En el entorno Docker, `DATABASE_URL` ya se inyecta automáticamente desde `docker-compose.yml`. Solo es necesario configurarla manualmente para desarrollo local.

---

## Estructura del proyecto

```
Reservorio/
├── .nvmrc
├── .node-version
├── .npmrc
├── .pnpmrc
├── docker-compose.yml
├── .env.production.example
├── .github/
│   └── workflows/ci.yml
├── backend/
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── scripts/
│   │   └── backup.sh
│   ├── db/
│   │   ├── init.sql          # esquema base (única fuente de verdad)
│   │   └── migrations/
│   │       └── README.md     # historial y notas
│   └── src/
│       ├── index.js
│       ├── db.js
│       ├── middleware/
│       │   ├── auth.js
│       │   ├── errorHandler.js
│       │   ├── jwt.js
│       │   ├── sanitize.js
│       │   └── validation.js
│       ├── routes/
│       │   ├── auth.routes.js
│       │   ├── businesses.routes.js
│       │   ├── bookings.routes.js
│       │   ├── categories.routes.js
│       │   ├── customers.routes.js
│       │   ├── google.routes.js
│       │   ├── notifications.routes.js
│       │   ├── payments.routes.js
│       │   ├── providers.routes.js
│       │   ├── ratings.routes.js
│       │   ├── reservations.routes.js
│       │   ├── services.routes.js
│       │   ├── tags.routes.js
│       │   └── ux.routes.js
│       ├── services/
│       │   ├── auth.service.js
│       │   ├── bookings.service.js
│       │   ├── businesses.service.js
│       │   ├── googleSheets.js
│       │   ├── notifications.service.js
│       │   ├── payments.service.js
│       │   └── syncService.js
│       └── utils/
│           └── crypto.js
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── angular.json
│   └── src/
│       ├── index.html
│       ├── main.ts
│       ├── styles.css
│       ├── app/
│       ├── assets/
│       └── environments/
└── docs/
    ├── API.md
    ├── DEVELOPERS.md
    └── GUIA-ADMIN.md
```

---

## Desarrollo local (sin Docker)

### Base de datos

Levanta solo el contenedor de PostgreSQL:

```bash
docker-compose up db
```

O usa una instancia local de PostgreSQL y ejecuta el schema manualmente:

```bash
psql -U reservorio -d reservorio -f backend/db/init.sql
```

### Backend

```bash
cd backend
pnpm install
pnpm run dev
```

El servidor arrancará en `http://localhost:3000` con recarga automática (nodemon).

### Frontend

```bash
cd frontend
pnpm install
pnpm start
```

La aplicación Angular arrancará en `http://localhost:4200` con proxy hacia `http://localhost:3000/api`.

### Arranque con scripts del repositorio

```bash
chmod +x scripts/dev.sh scripts/prod.sh
./scripts/dev.sh
```

```bash
./scripts/prod.sh
```

---

## Seguridad

- Todas las entradas del usuario pasan por `sanitize.js` antes de llegar a la base de datos. Las queries usan parámetros posicionales (`$1`, `$2`...) para prevenir inyección SQL.
- Los tokens JWT expiran en 8 horas y solo aceptan firmas **HS256** (`jwt.js` fija `algorithms: ['HS256']`).
- El backend aplica rate limiting: máximo **60 peticiones cada 15 minutos** por IP en todas las rutas `/api/`.
- Los endpoints de autenticación (`/api/auth/admin`, `/api/auth/owner/login`, `/api/auth/owner/register`) y el login por PIN (`/api/businesses/:id/auth`) tienen un límite estricto de **10 intentos cada 15 minutos** por IP (anti fuerza bruta).
- Las cabeceras de seguridad HTTP son gestionadas por `helmet`.
- El PIN de cada negocio se almacena como hash bcrypt (cost factor 10), nunca en texto plano.
- En producción el backend **aborta el arranque** si `JWT_SECRET` es débil, `ADMIN_PIN` es el default (`1234`) o no existe `CORS_ORIGINS`.

---

## Operación y monitoreo

### Health check y métricas

| Endpoint | Descripción |
|---|---|
| `GET /health` | Estado del servicio y conexión a PostgreSQL |
| `GET /metrics` | Uptime, nº de requests, errores del proceso, **desglose por status code**, uso de memoria y versión de Node |

Cada request emite un log **estructurado en JSON** (con `requestId`, método, URL, status y duración en ms). El `requestId` también se devuelve en la cabecera `X-Request-Id` para correlacionar errores.

### Backups

```bash
DATABASE_URL="postgres://reservorio:reservorio_pass@localhost:5432/reservorio" \
  ./backend/scripts/backup.sh
```

El script genera un dump de `pg_dump` con marca de tiempo en `backend/backups/`, conserva los últimos **14 días** por defecto y se puede programar con cron. Instrucciones completas dentro del propio script.

### CI/CD

El pipeline de GitHub Actions (`.github/workflows/ci.yml`) ejecuta en cada push/PR:
- Tests del backend (`pnpm test`).
- Build del frontend (`pnpm build`) y publica el artefacto `dist`.

---

## Documentación adicional

| Documento | Descripción |
|---|---|
| [docs/API.md](docs/API.md) | Referencia completa de todos los endpoints REST |
| [docs/DEVELOPERS.md](docs/DEVELOPERS.md) | Arquitectura interna, convenciones de código y mejoras pendientes |
| [docs/GUIA-ADMIN.md](docs/GUIA-ADMIN.md) | Guía de uso del panel para administradores de negocio |
| [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md) | Revisión de seguridad y despliegue antes de producción |
