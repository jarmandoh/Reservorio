# Mejoras y recomendaciones — Reservorio

Documento vivo: cada mejora marcada con ✅ indica trabajo completado y verificado. Las entradas sin marcar son el listado propuesto de mejoras y recomendaciones, ordenado por prioridad.

---

## Estado actual (resumen)

- **Backend**: Node 22 + Express 5 + PostgreSQL 16. **31 suites / 150 tests** (jest, `--runInBand`; suite de integración real solo en CI, gate `RUN_INTEGRATION=1`).
- **Frontend**: Angular 22 (Standalone + Signals) + Tailwind 3 + GSAP + Leaflet. Build OK, specs **vitest + jsdom** (`ng test --watch=false`), e2e Playwright en CI.
- **CI**: `.github/workflows/ci.yml` → service container PostgreSQL + `db:migrate` + tests (con integración real) + build frontend + **`ng test`** + **job E2E Playwright** en cada push/PR.
- **Migraciones**: `backend/db/migrate.js` + `backend/db/migrations/`. Docs: `README.md`, `backend/README.md`, `frontend/README.md`, `docs/API.md`, `docs/DEVELOPERS.md`, `docs/GUIA-ADMIN.md`, `SECURITY_CHECKLIST.md`, `DEPLOY.md`.

### Mejoras ya implementadas (histórico)

| #   | Mejora                                                                                                | Estado |
| --- | ----------------------------------------------------------------------------------------------------- | ------ |
| 1–4 | Flujo de reserva guiado, confirmación visual, pago con feedback y comparación de servicios            | ✅     |
| 5   | Notificaciones: canales email/SMS (`channels.js`), recordatorios, **OTP + magic-link** sin contraseña | ✅     |
| 6   | Experiencia móvil (touch targets, tarjetas),                                                          | ✅     |
| 7   | Trust signals: reseñas, verificación, políticas de cancelación                                        | ✅     |
| 8   | Disponibilidad real (índices únicos anti doble-reserva)                                               | ✅     |
| 9   | Panel del proveedor con acciones rápidas                                                              | ✅     |
| 10  | Analytics y métricas de negocio                                                                       | ✅     |
| 11  | Arquitectura separada services/repositories/validators                                                | ✅     |
| 12  | Canales de pago: Stripe/PayPal, transferencia, efectivo y anticipo 30%                                | ✅     |
| 13  | **Panel de cliente completo** (login sin contraseña, historial, "Reservar de nuevo")                  | ✅     |
| 14  | Panel admin avanzado (estadísticas, moderación de reseñas/pagos)                                      | ✅     |
| 15  | Seguridad: JWT HS256, rate limits, logs estructurados, validación de config                           | ✅     |
| 16  | Caché offline de lecturas públicas + banner de conexión                                               | ✅     |
| 17  | Documentación técnica y de producto                                                                   | ✅     |
| 18  | Branding: tokens visuales, favicon, theme-color                                                       | ✅     |
| 19  | Marketplace multi-proveedor                                                                           | ✅     |
| 20  | Despliegue: envs, backups, health/metrics, CI/CD                                                      | ✅     |

> Registro reciente con verificación: panel de cliente (24 suites/90 tests) y notificaciones/OTP (26 suites/111 tests) — ambas con build Angular OK, realizadas el 24/09/2026.
>
> Lote 24/09/2026 (2ª ronda): backoff OTP, pino, paginación, Docker multi-stage, vitest unificado, modo oscuro, CSV, i18n y E2E en CI. Verificado: **29 suites / 134 tests PASS** (backend), `pnpm build` + `ng test --watch=false` (2/2 vitest) verdes en frontend.
>
> Lote 24/09/2026 (3ª ronda, baja prioridad): GDPR (consentimiento/export/anonimización + `/privacy`), analytics de embudo (vista→reserva→pago), PWA (SW+manifest+iconos), SEO (robots/sitemap/JSON-LD), cabeceras Nginx (HSTS/CSP), backup+restauración, 404, y deuda menor (editorconfig/vscode/prettier/hooks, `node-fetch` retirado). Verificado: **31 suites / 150 tests PASS** (backend, con `gdpr.test.js` y `analytics.test.js`) y `pnpm build` verde en frontend.

---

## Próximas mejoras y recomendaciones

### Alta prioridad (estabilidad y fundamento)

- [x] **Migraciones SQL versionadas** ✅ — Runner propio sin dependencias (`backend/db/migrate.js`): aplica `backend/db/migrations/NNNN_*.sql` en orden, cada una en transacción y registrada en `schema_migrations`. Baseline `0001_init.sql` (copia de `init.sql`, ahora idempotente con `ON CONFLICT DO NOTHING`). Scripts `pnpm db:migrate` y `pnpm db:migrate:create`; el contenedor backend ejecuta las migraciones al arrancar (Dockerfile). Verificado: `0001_init.sql` coincide con `init.sql`.
- [x] **Renovación/refresh de tokens** ✅ — `POST /api/auth/refresh` re-emite tokens válidos dentro de una ventana de gracia (env `REFRESH_GRACE`, defecto 6 h) sin pedir credenciales, conservando rol e identidad (admin 2 h / resto 8 h). Frontend: `refreshSession()` en `AuthService` + refresco periódico cada h en `AppComponent` (silencioso; fuera de gracia → sesión caduca con normalidad). Rate limit dedicado (60/15 min). Verificado: suite `refresh.flow.test.js` (8 tests).
- [x] **Recordatorios agendados** ✅ — Worker `backend/src/services/reminders.worker.js`: consulta reservas en la ventana (`REMINDER_WINDOW_HOURS`, defecto 24 h) sin recordatorio previo, crea la notificación vía `sendReminderNotification` (email + SMS si `sms_opt_in`) y evita duplicados (`notifications` type='reminder' en queued/sent). Opt-in con `ENABLE_REMINDER_WORKER=1`, arranque en `index.js`, intervalo `REMINDER_INTERVAL_MINUTES` (60), `unref()` para no bloquear. Verificado: suite `reminders.worker.test.js` (5 tests).
- [x] **Tests de integración con Postgres real en CI** ✅ — Service container `postgres:16-alpine` en `.github/workflows/ci.yml`, schema cargado con `pnpm db:migrate` y suite ejecutándose con `RUN_INTEGRATION=1` + `DATABASE_URL` en cada push/PR.
- [x] **PIN de administración con hash** ✅ — `authenticateAdmin` compara con `bcrypt` (hash lazily cacheado) y acepta `ADMIN_PIN_HASH` (bcrypt) como alternativa segura; validación de producción en `index.js` adaptada. Verificado: `auth.service.test.js` (PIN correcto/incorrecto).

  ### Media prioridad (operación y calidad)

- [x] **Paginación en listados** ✅ — `bookings`, `payments`, `customers` e historial aceptan `page`/`pageSize` (solo si se pasan; sin params respuesta completa como antes): `backend/src/utils/pagination.js` (`parsePagination`, default 25, máx 200) y `meta {total,page,pageSize}` en la respuesta. Frontend: historial del cliente con controles anterior/siguiente (página 1 de N) y parámetros de API en `ApiService`. Verificado: `test/pagination.test.js` (9 tests).
- [x] **Logging estructurado con pino** ✅ — Logger central `backend/src/logger.js` (rotado a `logs/`, niveles por `LOG_LEVEL`); 14 módulos usan `logger.info/warn/error` con contexto; arranque y checks de config/DB en `index.js`; middleware de peticiones con `requestId`. Solo quedan `console.log` intencionales (canal console en `channels.js`).
- [x] **Docker multi-stage para el backend** ✅ — Dockerfile con stage `deps` (solo `--prod`) y runner final sin `devDependencies`/fuentes; migraciones al arrancar; `.dockerignore` raíz y `backend/`.
- [x] **E2E Playwright más amplios y en CI** ✅ — Specs existentes cubren reserva + panel admin (login, servicios, cambio de estado, alta/baja de servicio); ahora corren en GitHub Actions (job `e2e` con Postgres real, migraciones, backend+frontend levantados por `webServer` de Playwright y Chromium instalado).
- [x] **Runner de specs unificado** ✅ — **vitest** (v4, jsdom): retirados karma/jasmine de `devDependencies`, 2 specs migradas (`auth.service.spec.ts`, `owner-business.service.spec.ts`), `ng test --watch=false` verde y añadido a CI.
- [x] **i18n** ✅ — `@angular/localize@22.0.1` (peer de `@angular/build`) instalado y polyfill en `angular.json`; prepara `$localize` para traducciones futuras.
- [x] **Modo oscuro** ✅ — Tailwind `darkMode:'class'`, `ThemeService` (persistencia `reservorio_theme`, respeta preferencia del sistema), toggle globál en `AppComponent`, anti-flash en `index.html` y overrides de utilidades/componentes semánticos en `styles.css` (home, booking, paneles).
- [x] **Exportar reservas a CSV** ✅ — Botón "CSV" en `BusinessAdminComponent` (cabecera de Reservas): descarga `reservas-<negocio>-<fecha>.csv` (UTF-8 BOM, `;`) desde `filteredRes()`.
- [x] **Backoff en solicitudes OTP** ✅ — Máximo `OTP_MAX_REQUESTS` (5) por email en ventana de `OTP_WINDOW_MIN` (60 min); pasada la ventana el contador se reinicia para usuarios legítimos. Verificado: `customer-otp.test.js` (13 tests).

### Baja prioridad / mejoras de producto

- [x] **PWA offline-first real** ✅ — `@angular/service-worker@22.0.1` (pinned), `src/ngsw-config.json` (app prefetch, assets lazy, `dataGroups` API con strategy `freshness` 1 h), `manifest.webmanifest`, iconos PNG generados sin deps (`frontend/scripts/gen-icons.mjs`, 192/512 + maskable), `provideServiceWorker` en `app.config.ts` (`registerWhenStable:3000`, solo en producción) y `serviceWorker` habilitado en `angular.json`. Build emite `browser/ngsw.json`, `ngsw-worker.js` y `safety-worker.js`.
- [x] **SEO** ✅ — `src/robots.txt` (desindexa /api, /owner, /admin, /business, /customer, /payment), `src/sitemap.xml` (dominio placeholder `TU-DOMINIO.EJEMPLO` → sustituir en despliegue), JSON-LD `WebSite` + `SearchAction` en `index.html`, y metadatos dinámicos `Title`/`Meta` en `HomeComponent` y título por negocio en `BookingComponent`.
- [x] **Cumplimiento/GDPR** ✅ — Consentimiento explícito: formulario de reserva exige checkbox (política de privacidad en `/privacy`), backend exige `dataConsentRequired` (400 sin él) y almacena `data_consent`/`consent_at`/`marketing_consent` (migración `0002_consent_and_gdpr.sql`). Derechos: `GET /customers/:id/export` (JSON completo: perfil, reservas, pagos, notificaciones) y `DELETE /customers/:id` **anonimiza** (nombre/email/teléfono borrados, códigos de acceso invalidos; sin borrado físico para no romper pagos). UI en "Mis datos (RGPD)" del historial + página `/privacy`.
- [x] **Seguridad del sandbox Nginx** ✅ — `server_tokens off` (ya existía) + **HSTS** (`max-age=31536000`) + **CSP** (script/style `'self' 'unsafe-inline'` por scripts anti-flash, `img-src` OpenStreetMap, `connect/frame-src` Stripe, `object-src 'none'`, `frame-ancestors 'self'`) a nivel server **y** repetidas en el location de estáticos (que define su propio `add_header` y no hereda).
- [x] **Backup agendado y restaurado** ✅ — Servicio `backup` en `docker-compose.yml` (sidecar `postgres:16-alpine`): `pg_dump -Fc -Z9` diario a `./backups/`, retención 14 días (`find -mtime +14`), volumen bind-mount host. `backend/scripts/restore.sh` restaura un volcado con confirmación, corte de conexiones y `DROP/CREATE` + `pg_restore`. Restauración manual pendiente de una prueba real en despliegue.
- [x] **Gráficas de conversión en el panel admin** ✅ — Embudo (vista → reserva → pago, 30 días) en "Panel": migración `0003_analytics.sql` (`analytics_events`), `POST /api/analytics/view` (rate 300/15 min, fallback memoria), grabación de vista en `BookingComponent`, `funnel` en `getMarketplaceStats()` y bloque visual con barras de conversión en `admin.component.html`. Verificado: `test/gdpr.test.js` (13) + `test/analytics.test.js` (6), backend **31 suites / 150 tests PASS**.
- [x] **Página 404 personalizada** ✅ — `NotFoundComponent` reemplaza el wildcard `redirectTo`, con enlaces útiles (inicio, acceso negocios, admin) y lexía monográfica.
- [x] **Limpieza de deuda menor** ✅ — `.editorconfig` raíz, `.vscode/extensions.json` + `settings.json` (whitelisted en `.gitignore`), Prettier 3 como devDep + `.prettierrc`/`.prettierignore` + scripts `format:check`/`format:fix` en frontend, gancho `.githooks/pre-commit` (prettier --check sobre staged; activar con `git config core.hooksPath .githooks`), y eliminada dependencia sin uso `node-fetch` del backend (se usa el `fetch` global de Node 22).

### Escalabilidad P0 (estabilidad y fundamento distribuido)

- [x] **Redis para rate-limit distribuido y caché** ✅ — `ioredis@5.11` + `rate-limit-redis@4.3` (`backend/package.json:36`, `backend/src/cache.js`). Rate-limit global usa `RedisStore` si `REDIS_URL` está definido (`backend/src/index.js:112`), fallback a `MemoryStore`. Caché de `listBusinesses`/`listAll`/`listOwner`/`getBusinessById` (`backend/src/services/businesses.service.js:7`) y `ratings:list/avg` (`backend/src/services/ratings.service.js:4`) TTL 60/30s, invalida en mutaciones. Servicio `redis:7-alpine` en `docker-compose.yml:2` (128 MB LRU, healthcheck `redis-cli ping`, volumen `redisdata`). Verificado: backend 31/31 suites 150 tests PASS, frontend `ng build` OK, E2E 4/4 PASS.
- [x] **Pool de Postgres tuneado y PgBouncer-ready** ✅ — `backend/src/db.js:6` parametrizado vía `PG_POOL_MAX` (20), `PG_POOL_IDLE_TIMEOUT`, `PG_POOL_CONNECTION_TIMEOUT`, `PG_STATEMENT_TIMEOUT`, `PG_QUERY_TIMEOUT`. Documentado en `.env.production.example:17` y `docker-compose.yml:28`. Compatible con PgBouncer transaction pooling.
- [x] **Worker distribuido sin duplicados** ✅ — `backend/src/services/reminders.worker.js:23` usa `SELECT ... FOR UPDATE OF b SKIP LOCKED` dentro de transacción cuando `NODE_ENV !== test` y `db.connect` disponible; `SKIP LOCKED` evita que N réplicas reclamen la misma reserva. Fallback sin `FOR UPDATE` en tests para no romper mocks. Verificado en `test/reminders.worker.test.js`.
- [x] **Trust proxy + graceful shutdown** ✅ — `app.set('trust proxy', TRUST_PROXY)` (`backend/src/index.js:93`) para `X-Forwarded-For` correcto tras nginx. `setupGracefulShutdown` (`backend/src/index.js:268`) captura `SIGTERM`/`SIGINT`/`uncaughtException`, cierra `server.close()` → `pool.end()` → `cache.quit()` con timeout 10s. `TRUST_PROXY` documentado en `.env.production.example`.

### Escalabilidad P1 (estabilidad prod)

- [x] **Paginación en listados críticos** ✅ — `GET /api/businesses` y `GET /api/businesses/:id/reservations` aceptan `?page=&pageSize=` (`backend/src/routes/businesses.routes.js:81`, `backend/src/services/businesses.service.js:97`, `backend/src/repositories/business.repository.js:6` `buildBusinessWhereClauses` + `LIMIT/OFFSET` + `countBusinesses`/`countReservations`). Si no se pasan `page`/`pageSize`, respuesta completa como antes (compatible). Méta `meta:{total,page,pageSize}` solo si se pagina. Cache deshabilitada en modo paginado; invalidación `delByPrefix('biz:list:')` limpia páginas. Verificado: backend 31/31 PASS, E2E 4/4 PASS.
- [x] **Auth en notificaciones + fix bulkCreateSlots** ✅ — `POST /api/notifications` y `POST /api/notifications/reminder` ahora requieren `requireAuth` (`backend/src/routes/notifications.routes.js:31`, `40`). `GET` permanece público. `bulkCreateSlots` (`backend/src/services/syncService.js:104`) ya no interpola strings: placeholders parametrizados `$1..$7` por fila, `clean()` + validación de `franja`/`disponibilidad` enum.
- [x] **Secret management hardening** ✅ — `.gitignore:4` whitelista correcta `!backend/.env.example` y `!backend/.env.production.example`, `backend/.env.example:1` documenta `chmod 600` y `generate-secrets.mjs` + `REDIS_URL`/`PG_POOL_*`/`CACHE_TTL_*`/`TRUST_PROXY`. `docker-compose.yml:43` usa `JWT_SECRET`/`ADMIN_PIN_HASH` sin fallback débil (validateRuntimeConfig abortará si son débiles) y añade `FRONTEND_URL`/`ADMIN_PIN_HASH`.
- [x] **Observabilidad Prometheus** ✅ — `prom-client@15.1` (`backend/package.json:37`), registry `reservorio_` + `collectDefaultMetrics` (`backend/src/index.js:13`), histogram `reservorio_http_request_duration_seconds` y counter `reservorio_http_requests_total` etiquetados por `method/route/status` (`backend/src/index.js:182`). `GET /metrics` sirve Prometheus si `Accept: text/plain` o `?format=prometheus` (`backend/src/index.js:258`), JSON si no.
- [x] **TLS externo con Caddy** ✅ — `Caddyfile:1` reverse_proxy `frontend:80` con `header` HSTS y `encode gzip`, TLS automático Let's Encrypt. `docker-compose.prod.yml:1` overlay añade servicio `caddy:2-alpine` en `:80/:443`, `FRONTEND_HOST` desde env, y quita `ports` del `frontend` interno. `.env.production.example:48` añade `FRONTEND_HOST`. Documentado en `DEPLOY.md:25`.

### Escalabilidad P2 (operación y calidad)

- [x] **HTTP interceptor centralizado** ✅ — `frontend/src/app/core/interceptors/http.interceptor.ts:1` `authInterceptor` (inyecta `Authorization: Bearer` desde `StorageService` — prioriza `negocio_jwt_<id>` si URL contiene `/businesses/<id>`, luego `admin`/`owner`/`customer`, evita circular con `AuthService`, añade `X-Request-Id`; `errorInterceptor` toastea `401`/`429`/`5xx`). `frontend/src/app/app.config.ts:1` `provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))`. Verificado: `ng build` OK, E2E 4/4 PASS.
- [x] **Compresión + límites** ✅ — `compression@1.8` (`backend/package.json:36`, `backend/src/index.js:11` `app.use(compression({threshold:1024}))` tras `helmet` y `express.json({limit: JSON_LIMIT||'100kb'})` (`backend/src/index.js:179`). Env `JSON_LIMIT` documentado en `.env.production.example:43` y `backend/.env.example:14`.
- [x] **Advisory lock en migraciones** ✅ — `backend/db/migrate.js:27` `ADVISORY_LOCK_ID=727727727`, `SELECT pg_advisory_lock($1)` antes de `CREATE TABLE schema_migrations` y `SELECT pg_advisory_unlock($1)` en `finally`; evita `scale backend=3` concurrente.
- [x] **Recursos y logging driver** ✅ — `docker-compose.yml:2` cada servicio con `mem_limit`/`cpus` (`redis 256m/0.5`, `db 512m/1.0`, `backend 512m/1.0`, `frontend 256m/0.5`, `backup 128m/0.25`) y `logging: json-file max-size 10m max-file 3`. `frontend` healthcheck `http://localhost/` en vez de `/health`.
- [x] **CI hardening** ✅ — `.github/workflows/ci.yml:3` `concurrency: cancel-in-progress` + `permissions: contents:read`, job `lint:1` `prettier --check` (`frontend format:check`), jobs `backend`/`frontend` con `docker build -t reservorio-*:ci` smoke.

### Escalabilidad P3 (producto y eficiencia)

- [x] **Polling con pausa por visibilidad + SSE realtime** ✅ — `frontend/src/app/features/booking/booking.component.ts:1048` y `business-admin.component.ts:1170` `setupVisibilityPause()` (`fromEvent(document,'visibilitychange')` pausa `pollSub` si `hidden`, reanuda al volver). `backend/src/services/realtime.service.js:1` SSE `GET /api/realtime/stream?businessId` (`Content-Type: text/event-stream`, ping 25s, broadcast `booking_created/updated`), `backend/src/routes/realtime.routes.js:1`, `frontend/src/app/core/services/realtime.service.ts:1` `EventSource` con `NgZone`. Integrado en booking (`setupRealtime()`) y business-admin para recargar sin polling.
- [x] **Zoneless experimental (opt-in)** ✅ — `frontend/src/app/app.config.ts:1` documenta `provideZonelessChangeDetection()` (quitar `zone.js` de `polyfills` en `angular.json:50` para activar). Polling ya usa `takeUntilDestroyed` y `computed` memoizado, listo para zoneless.
- [x] **Coverage gates** ✅ — `backend/package.json:48` jest `coverageThreshold` `branches 45/functions 50/lines 55/statements 55`, `frontend` `@vitest/coverage-v8@4.1` (`frontend/package.json:41`) + `ng test --watch=false --coverage` (`frontend/angular.json:118`), CI `.github/workflows/ci.yml:80` `pnpm exec jest --coverage` + `upload-artifact` backend/frontend.
- [x] **Backup offsite S3** ✅ — `backend/scripts/backup-offsite.sh:1` `rclone sync` (fallback `aws s3 sync`) si `BACKUP_S3_BUCKET` definido, soporta `BACKUP_S3_CRYPT_REMOTE`. `docker-compose.yml:99` servicio `backup-offsite` (`rclone/rclone:1.66`, profile `offsite`, comparte `./backups`). `.env.production.example:105` `BACKUP_S3_BUCKET`/`CRYPT_REMOTE`.
- [x] **Monorepo pnpm-workspace + turbo** ✅ — `pnpm-workspace.yaml:1` (`backend`, `frontend`), `turbo.json:1` `tasks: build/test/format:check`, `package.json:1` workspace `turbo@2.11` (`private:true`), `.npmrc:4` `shared-workspace-lockfile=false` (locks separados). `turbo run build` cachea `dist/**`.

### Próximas funcionalidades propuestas (Producto) — Matriz impacto / esfuerzo

Documento vivo para P4+. Cada fila es una funcionalidad candidata con estimación y dependencias. Estado: `⬜` pendiente, `🟡` en diseño, `✅` hecho.

| #     | Funcionalidad                                                   | Problema que resuelve                   | Impacto    | Esfuerzo     | Riesgo         | Dependencias / Notas                                                                                                                                                                                                 |
| ----- | --------------------------------------------------------------- | --------------------------------------- | ---------- | ------------ | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A** | **Lista de espera + re-asignación automática** (`waitlist`)     | Huecos por cancelación → ocupación      | **Alto**   | Medio (2–3d) | Bajo           | Tabla `waitlist(business_id, slot, customer_id, created_at)`, `POST /api/businesses/:id/waitlist`, trigger en `updateReservation` `Cancelado` → `broadcast('slot_available')` + `notificationsService`               |
| **B** | **Cupones / descuentos / referidos**                            | Adquisición/retención, ticket medio     | **Alto**   | Medio (3d)   | Medio (abuso)  | `coupons(code unique, discount_type %, value, max_uses, expires_at, business_id)`, valida en `POST /api/businesses/:id/checkout` y `POST /api/payments/checkout`, descuenta `dueAmount()` `booking.component.ts:876` |
| **C** | **Recordatorio WhatsApp (Twilio/360dialog) + SMS fallback**     | +40% asistencia vs solo email           | **Alto**   | Medio (2d)   | Coste/msg      | Extiende `channels.js` + `reminders.worker.js:23` con canal `whatsapp`, env `WHATSAPP_PROVIDER`                                                                                                                      |
| **D** | **Calendario 2-way Google/Outlook**                             | Evita doble-reserva fuera de Reservorio | **Alto**   | Alto (5d)    | Sync complejo  | Extiende `google.routes.js` + `syncService.js` con `watch` Calendar API + `schedules`                                                                                                                                |
| **E** | **Equipo / roles por negocio** (`owner → manager/staff`)        | Negocios 2+ empleados                   | Medio-Alto | Medio (3d)   | Migración RBAC | `business_members(business_id, user_id, role)`, `requireBusinessAuth` + `canAccessBusiness` `middleware/auth.js:77`                                                                                                  |
| **F** | **Predicción no-show + overbooking inteligente**                | Ingresos / ocupación                    | Medio      | Alto (4d)    | Modelo         | Heurística `bookings` 30d + `analytics_events`, score en `admin.service.js`                                                                                                                                          |
| **G** | **Reseñas con foto + respuesta del negocio**                    | Trust / conversión                      | Medio      | Bajo (1.5d)  | Storage        | `ratings` + `photo_url` (R2/S3), `POST /api/ratings/:id/photo` `multer` → R2, UI `booking.component.ts:734`                                                                                                          |
| **H** | **Búsqueda full-text + geo** (`tsvector` + `pg_trgm`/`postgis`) | Descubrimiento                          | Medio      | Medio (2d)   | Índice         | `businesses` `tsvector` + `GIN`, `location` geo, `business.repository.js:6` `buildBusinessWhereClauses`                                                                                                              |
| **I** | **Suscripciones / membresías / gift cards**                     | Recurrencia (MRR)                       | Medio      | Alto (4d)    | Stripe Billing | Stripe Billing `subscriptions`, `gift_cards` tabla, `payments.service.js`                                                                                                                                            |
| **J** | **Chat in-app ligero + notas internas** (SSE ya disponible)     | Soporte / upsell                        | Bajo-Medio | Medio (2d)   | Moderación     | Reusa `realtime.service.js:1` SSE `chat_message`, `notifications` `channel=in_app`                                                                                                                                   |

**Orden recomendado (quick wins → diferenciación):**

1. **Fase P4.1 (2 semanas)**: **A → B → G → H** — monetizables y de bajo riesgo, validan demanda sin infra nueva.
2. **Fase P4.2 (2–3 semanas)**: **C → D → E** — requieren proveedor externo (WhatsApp/Calendar) y RBAC.

**Criterio de priorización P4:** elige 2–3 de la tabla según objetivo 60 días: **ocupación** (A/D), **ingresos recurrentes** (B/I) o **retención** (C/G). Ver `docs/API.md` y `DEPLOY.md` para envs asociados (`WHATSAPP_*`, `COUPON_*`).

---

## Prioridad recomendada

1. **Fundamento**: migraciones versionadas + refresh de tokens + PIN de admin con hash.
2. **Automatización**: worker de recordatorios + tests de integración en CI.
3. **Operación**: pino, paginación, Docker multi-stage, limpieza de deuda.
4. **Producto**: PWA, SEO y cumplimiento GDPR.

> Regla del proyecto: cada mejora que se implemente debe actualizar este documento (✅ + nota de verificación) y, si afecta API/despliegue, también `docs/API.md`, `DEPLOY.md` o `SECURITY_CHECKLIST.md` según corresponda.
