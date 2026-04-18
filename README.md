# Reservorio

Sistema de reservas multi-negocio. Permite a clientes consultar disponibilidad y reservar franjas horarias en negocios como canchas deportivas, salones de belleza, consultorios y similares. Los administradores de cada negocio gestionan sus reservaciones y servicios desde un panel propio.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Angular 17 + Tailwind CSS, servido con Nginx |
| Backend | Node.js + Express 5 |
| Base de datos | PostgreSQL 16 |
| Infraestructura | Docker + Docker Compose |
| Autenticación | JWT (jsonwebtoken) + bcrypt |

---

## Requisitos previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (incluye Docker Compose)
- Git

Para desarrollo local sin Docker se necesita adicionalmente Node.js 20+ y una instancia de PostgreSQL.

---

## Inicio rápido

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd Reservorio
```

### 2. Crear el archivo de variables de entorno

```bash
cp backend/.env.example backend/.env
```

Edita `backend/.env` y configura los valores descritos en la siguiente sección.

### 3. Levantar los servicios

```bash
docker-compose up --build
```

La primera vez Docker descargará las imágenes, instalará dependencias y ejecutará el schema SQL automáticamente. Al terminar:

| Servicio | URL |
|---|---|
| Frontend (app) | http://localhost |
| API REST | http://localhost:3000/api |
| PostgreSQL | localhost:5432 |

Para detener todos los servicios:

```bash
docker-compose down
```

Para detener y **eliminar los datos** (volumen de la base de datos):

```bash
docker-compose down -v
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
├── docker-compose.yml        # Orquesta los tres servicios: db, backend, frontend
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── db/
│   │   └── init.sql          # Schema inicial: tablas businesses, services, reservations
│   └── src/
│       ├── index.js           # Punto de entrada de Express
│       ├── db.js              # Pool de conexión a PostgreSQL
│       ├── middleware/
│       │   ├── jwt.js         # Firma y verificación de tokens
│       │   └── sanitize.js    # Validación y limpieza de entradas
│       └── routes/
│           ├── auth.routes.js          # POST /api/auth/admin
│           ├── businesses.routes.js    # CRUD de negocios + sus reservas/servicios
│           ├── reservations.routes.js  # Rutas legacy /api/reservations
│           └── services.routes.js      # Rutas legacy /api/services
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
│       └── app/
│           ├── core/           # Guards, modelos, servicios compartidos
│           ├── features/       # Páginas: home, booking, admin, business-admin, login
│           └── shared/         # Componentes reutilizables (badge, toast)
└── legacy/                     # Versión HTML/JS original (referencia histórica)
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
npm install
npm run dev
```

El servidor arrancará en `http://localhost:3000` con recarga automática (nodemon).

### Frontend

```bash
cd frontend
npm install
npm start
```

La aplicación Angular arrancará en `http://localhost:4200` con proxy hacia `http://localhost:3000/api`.

---

## Seguridad

- Todas las entradas del usuario pasan por `sanitize.js` antes de llegar a la base de datos. Las queries usan parámetros posicionales (`$1`, `$2`...) para prevenir inyección SQL.
- Los tokens JWT expiran en 8 horas.
- El backend aplica rate limiting: máximo 60 peticiones cada 15 minutos por IP en todas las rutas `/api/`.
- Las cabeceras de seguridad HTTP son gestionadas por `helmet`.
- El PIN de cada negocio se almacena como hash bcrypt (cost factor 10), nunca en texto plano.

---

## Documentación adicional

| Documento | Descripción |
|---|---|
| [docs/API.md](docs/API.md) | Referencia completa de todos los endpoints REST |
| [docs/DEVELOPERS.md](docs/DEVELOPERS.md) | Arquitectura interna, convenciones de código y mejoras pendientes |
| [docs/GUIA-ADMIN.md](docs/GUIA-ADMIN.md) | Guía de uso del panel para administradores de negocio |
