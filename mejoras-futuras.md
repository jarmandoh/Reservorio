# Mejoras y recomendaciones — Reservorio

Documento vivo: cada mejora marcada con ✅ indica trabajo completado y verificado. Las entradas sin marcar son el listado propuesto de mejoras y recomendaciones, ordenado por prioridad.

---

## Estado actual (resumen)

- **Backend**: Node 22 + Express 5 + PostgreSQL 16. **31 suites / 149 tests** (jest, `--runInBand`; suite de integración real solo en CI, gate `RUN_INTEGRATION=1`).
- **Frontend**: Angular 22 (Standalone + Signals) + Tailwind 3 + GSAP + Leaflet. Build OK, specs **vitest + jsdom** (`ng test --watch=false`), e2e Playwright en CI.
- **CI**: `.github/workflows/ci.yml` → service container PostgreSQL + `db:migrate` + tests (con integración real) + build frontend + **`ng test`** + **job E2E Playwright** en cada push/PR.
- **Migraciones**: `backend/db/migrate.js` + `backend/db/migrations/`. Docs: `README.md`, `backend/README.md`, `frontend/README.md`, `docs/API.md`, `docs/DEVELOPERS.md`, `docs/GUIA-ADMIN.md`, `SECURITY_CHECKLIST.md`, `DEPLOY.md`.

### Mejoras ya implementadas (histórico)

| # | Mejora | Estado |
|---|---|---|
| 1–4 | Flujo de reserva guiado, confirmación visual, pago con feedback y comparación de servicios | ✅ |
| 5 | Notificaciones: canales email/SMS (`channels.js`), recordatorios, **OTP + magic-link** sin contraseña | ✅ |
| 6 | Experiencia móvil (touch targets, tarjetas), | ✅ |
| 7 | Trust signals: reseñas, verificación, políticas de cancelación | ✅ |
| 8 | Disponibilidad real (índices únicos anti doble-reserva) | ✅ |
| 9 | Panel del proveedor con acciones rápidas | ✅ |
| 10 | Analytics y métricas de negocio | ✅ |
| 11 | Arquitectura separada services/repositories/validators | ✅ |
| 12 | Canales de pago: Stripe/PayPal, transferencia, efectivo y anticipo 30% | ✅ |
| 13 | **Panel de cliente completo** (login sin contraseña, historial, "Reservar de nuevo") | ✅ |
| 14 | Panel admin avanzado (estadísticas, moderación de reseñas/pagos) | ✅ |
| 15 | Seguridad: JWT HS256, rate limits, logs estructurados, validación de config | ✅ |
| 16 | Caché offline de lecturas públicas + banner de conexión | ✅ |
| 17 | Documentación técnica y de producto | ✅ |
| 18 | Branding: tokens visuales, favicon, theme-color | ✅ |
| 19 | Marketplace multi-proveedor | ✅ |
| 20 | Despliegue: envs, backups, health/metrics, CI/CD | ✅ |

> Registro reciente con verificación: panel de cliente (24 suites/90 tests) y notificaciones/OTP (26 suites/111 tests) — ambas con build Angular OK, realizadas el 24/09/2026.
>
> Lote 24/09/2026 (2ª ronda): backoff OTP, pino, paginación, Docker multi-stage, vitest unificado, modo oscuro, CSV, i18n y E2E en CI. Verificado: **29 suites / 134 tests PASS** (backend), `pnpm build` + `ng test --watch=false` (2/2 vitest) verdes en frontend.
>
> Lote 24/09/2026 (3ª ronda, baja prioridad): GDPR (consentimiento/export/anonimización + `/privacy`), analytics de embudo (vista→reserva→pago), PWA (SW+manifest+iconos), SEO (robots/sitemap/JSON-LD), cabeceras Nginx (HSTS/CSP), backup+restauración, 404, y deuda menor (editorconfig/vscode/prettier/hooks, `node-fetch` retirado). Verificado: **31 suites / 149 tests PASS** (backend, con `gdpr.test.js` y `analytics.test.js`) y `pnpm build` verde en frontend.

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
- [x] **Gráficas de conversión en el panel admin** ✅ — Embudo (vista → reserva → pago, 30 días) en "Panel": migración `0003_analytics.sql` (`analytics_events`), `POST /api/analytics/view` (rate 300/15 min, fallback memoria), grabación de vista en `BookingComponent`, `funnel` en `getMarketplaceStats()` y bloque visual con barras de conversión en `admin.component.html`. Verificado: `test/gdpr.test.js` (13) + `test/analytics.test.js` (6), backend **31 suites / 149 tests PASS**.
- [x] **Página 404 personalizada** ✅ — `NotFoundComponent` reemplaza el wildcard `redirectTo`, con enlaces útiles (inicio, acceso negocios, admin) y lexía monográfica.
- [x] **Limpieza de deuda menor** ✅ — `.editorconfig` raíz, `.vscode/extensions.json` + `settings.json` (whitelisted en `.gitignore`), Prettier 3 como devDep + `.prettierrc`/`.prettierignore` + scripts `format:check`/`format:fix` en frontend, gancho `.githooks/pre-commit` (prettier --check sobre staged; activar con `git config core.hooksPath .githooks`), y eliminada dependencia sin uso `node-fetch` del backend (se usa el `fetch` global de Node 22).

---

## Prioridad recomendada

1. **Fundamento**: migraciones versionadas + refresh de tokens + PIN de admin con hash.
2. **Automatización**: worker de recordatorios + tests de integración en CI.
3. **Operación**: pino, paginación, Docker multi-stage, limpieza de deuda.
4. **Producto**: PWA, SEO y cumplimiento GDPR.

> Regla del proyecto: cada mejora que se implemente debe actualizar este documento (✅ + nota de verificación) y, si afecta API/despliegue, también `docs/API.md`, `DEPLOY.md` o `SECURITY_CHECKLIST.md` según corresponda.