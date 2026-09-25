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

- Usa HTTPS con un reverse proxy o CDN real.
- Mantén `CORS_ORIGINS` limitado a dominios reales.
- No expongas la base de datos directamente al público.
- Cambia el valor por defecto de `ADMIN_PIN` antes del despliegue (o usa `ADMIN_PIN_HASH`, comparación bcrypt).
- Verifica que `OTP_DEBUG` no esté activo y que los webhooks de email/SMS usen token Bearer.
- Revisa periódicamente los logs del backend y del contenedor.

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
- **SEO**: sustituye el dominio placeholder `TU-DOMINIO.EJEMPLO` en `frontend/src/robots.txt` y `frontend/src/sitemap.xml` por el dominio real (los ficheros se copian a la raíz del sitio en el build).
- **HTTPS**: el contenedor Nginx envía HSTS y CSP, pero solo tienen efecto sirviendo el sitio por HTTPS (usa un reverse proxy/CDN con TLS real; el `Strict-Transport-Security` se ignora en HTTP simple).

## 7. Reset rápido

```bash
docker compose down -v
```

> Solo usa esto si quieres borrar completamente los datos de la base de datos.
