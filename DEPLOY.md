# Despliegue en producción

## 1. Preparar el entorno

1. Copia la plantilla:

   ```bash
   copy .env.production.example .env.production
   ```

2. Ajusta los valores sensibles en `.env.production`:
   - `JWT_SECRET`
   - `ADMIN_PIN` (o `ADMIN_PIN_HASH` con un hash bcrypt y dejar `ADMIN_PIN` sin usar)
   - `DATABASE_URL`
   - `CORS_ORIGINS`
   - `FRONTEND_URL` (dominio público real — se usa en los magic-links de cliente)
   - `EMAIL_PROVIDER` / `EMAIL_WEBHOOK_URL` (+ `EMAIL_WEBHOOK_HEADERS` con el token) y `SMS_*` si se envían notificaciones
   - `OTP_DEBUG` debe quedar vacío o `0` (¡nunca `1` en producción!)
   - `REFRESH_GRACE` (ventana de re-emisión de tokens; defecto 6 h)
   - `ENABLE_REMINDER_WORKER=1` si quieres recordatorios agendados (email/SMS respetando `sms_opt_in`); `REMINDER_WINDOW_HOURS` y `REMINDER_INTERVAL_MINUTES` para ajustar ventana/cadencia
   - Google OAuth y Apps Script si se usan

> No subas este archivo a Git ni lo compartas en repositorios públicos.

## 2. Levantar la aplicación

Desde la raíz del proyecto:

```bash
docker compose --env-file .env.production up --build -d
```

Esto levanta:
- PostgreSQL
- Redis (caché y rate-limit distribuido, 128 MB LRU)
- Backend (pool Pg tuneado, trust proxy, graceful shutdown)
- Frontend servido con Nginx

> **Redis**: si `REDIS_URL` se deja vacío el backend hace fallback a memoria (sin distribución).
> En `docker-compose.yml` ya está cableado como `redis://redis:6379`. Para PgBouncer
> en modo transaction apunta `DATABASE_URL` al puerto de PgBouncer y deja
> `PG_POOL_MAX`/`PG_STATEMENT_TIMEOUT` como en `.env.production.example`.

> **Migraciones**: el contenedor backend ejecuta `node db/migrate.js` antes de arrancar, así que sobre un volumen PostgreSQL ya existente se aplican automáticamente los cambios de schema en orden (registrados en `schema_migrations`). Haz siempre backup antes de un despliegue con migraciones.

## 3. Verificar salud

```bash
curl http://localhost:3000/health
curl http://localhost/health
```

El backend debe responder con `ok: true` y la base de datos en estado `connected`.

## 4. Seguridad recomendada

- Usa HTTPS con el overlay TLS: `docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production up -d` (Caddy en `:80/:443` con Let's Encrypt automático; requiere `FRONTEND_HOST` y DNS apuntando al host, ver `Caddyfile:1` y `docker-compose.prod.yml:1`). Alternativa: reverse proxy/CDN externo.
- Mantén `CORS_ORIGINS` limitado a dominios reales.
- No expongas la base de datos directamente al público (`127.0.0.1:5432` solo en `docker-compose.yml:13`).
- Cambia el valor por defecto de `ADMIN_PIN` antes del despliegue (o usa `ADMIN_PIN_HASH`, comparación bcrypt). Genera con `node backend/scripts/generate-secrets.mjs` y haz `chmod 600 backend/.env`.
- Verifica que `OTP_DEBUG` no esté activo y que los webhooks de email/SMS usen token Bearer.
- `POST /api/notifications` y `POST /api/notifications/reminder` requieren `Authorization: Bearer` desde P1 (`backend/src/routes/notifications.routes.js:31`), y `POST /api/businesses/:id/reservations` valida paginación `?page=&pageSize=` (`backend/src/routes/businesses.routes.js:81`).
- Revisa periódicamente los logs del backend y del contenedor. Métricas Prometheus en `GET /metrics?format=prometheus` o `Accept: text/plain` (`backend/src/index.js:258`, `reservorio_http_requests_total`).

## 5. Actualizaciones

Para desplegar cambios nuevos:

```bash
docker compose --env-file .env.production pull
docker compose --env-file .env.production up --build -d
```

## 6. Backup y restauración de la base de datos

### Backups automáticos

El servicio `backup` de docker-compose vuelca la base a diario (formato compatible con `pg_restore`) en `./backups/` y conserva **14 días** de historia:

```bash
docker compose up -d backup
```

Verifica que se generen ficheros:

```bash
ls -la backups/   # ej. reservorio-20260924-030000.dump
```

> La retención y el horario se controlan en `docker-compose.yml` (bucle `sleep 86400` y `find -mtime +14 -delete`).

### Restauración manual

Antes de restaurar, detén el backend para evitar escrituras concurrentes:

```bash
docker compose stop backend
bash backend/scripts/restore.sh backups/reservorio-20260924-030000.dump
docker compose start backend
```

El script pide confirmación, corta conexiones activas, recrea la base y aplica el volcado con `pg_restore`. **Prueba una restauración real al menos una vez en un entorno de ensayo** antes de confiar en ella en producción.

### PWA, SEO y dominio

- **PWA**: `ng build` genera `browser/ngsw.json` + `ngsw-worker.js`; el Service Worker se registra en producción. Tras desplegar una versión nueva, los usuarios la activan en el siguiente arranque (el SW comprueba actualizaciones).
- **Dominio canónico**: esta configuración usa `https://reservorio.app`. Antes de publicar, configura DNS para ese host y define `FRONTEND_URL=https://reservorio.app`, `FRONTEND_HOST=reservorio.app` y `CORS_ORIGINS=https://reservorio.app` en `.env.production`. Si el dominio de despliegue difiere, cambia también `CANONICAL_ORIGIN` en `frontend/src/app/core/services/seo.service.ts`, `frontend/src/index.html`, `frontend/src/robots.txt` y `frontend/src/sitemap.xml`.
- **SEO**: sitemap solo incluye home y política de privacidad, las únicas páginas actualmente indexables. Canonical, título, descripción y Open Graph se actualizan por ruta; flujos de reserva, pago, login, cuentas, paneles y rutas desconocidas quedan `noindex`. Nginx refuerza la política con `X-Robots-Tag`. Mantén fuera del sitemap páginas interactivas o datos de negocio que no se rendericen públicamente.
- **SSR/prerender**: se mantiene la SPA cliente por ahora. No hay una ruta pública de ficha de negocio; reserva y pago son flujos transaccionales, y el listado de home depende de API dinámica. Reevaluar SSR/prerender al crear páginas públicas indexables de negocio y medir su contenido/metadata inicial antes de cambiar la arquitectura.
- **HTTPS**: el contenedor Nginx envía HSTS y CSP, pero solo tienen efecto sirviendo el sitio por HTTPS (usa un reverse proxy/CDN con TLS real; el `Strict-Transport-Security` se ignora en HTTP simple).

### 8. Smoke de release en staging

Antes de publicar, apunta las pruebas de release a staging (sin iniciar servidores locales):

```bash
cd frontend
PLAYWRIGHT_SKIP_SERVER=1 PLAYWRIGHT_BASE_URL=https://staging.reservorio.app \
  pnpm exec playwright test --project=chromium-smoke --project=chromium-a11y
```

Verifica manualmente con el dominio de staging:

```bash
curl -fsSI https://staging.reservorio.app/
curl -fsSI https://staging.reservorio.app/privacy
curl -fsSI https://staging.reservorio.app/booking/smoke
curl -fsS https://staging.reservorio.app/robots.txt
curl -fsS https://staging.reservorio.app/sitemap.xml
curl -fsS https://staging.reservorio.app/api/businesses
```

Confirma certificado válido, redirección HTTP→HTTPS, CSP sin violaciones al cargar fuentes/mapas/checkout, `X-Robots-Tag: index, follow` solo en `/` y `/privacy`, `noindex` en flujos privados/transaccionales, rutas profundas con HTML/Angular funcional, API disponible y checkout Stripe en modo de prueba. No completes un pago real como parte del smoke. Registra fecha, commit desplegado, resultados y URL de staging en el informe de release; envía sitemap a Search Console cuando tengas acceso verificado al dominio.

## 7. Reset rápido

```bash
docker compose down -v
```

> Solo usa esto si quieres borrar completamente los datos de la base de datos.
