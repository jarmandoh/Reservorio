# Checklist de seguridad y despliegue

Estado por ítem:
- ✅ **Implementado / verificado en el código** (sin acción).
- 🟠 **Operativo**: solo requiere que configures un valor en el `.env` o en el despliegue (bloquea el arranque en producción si falla la validación).
- ⬜ **Pendiente** de implementar.

## Variables de entorno

- [x] **JWT_SECRET aleatorio y fuerte** ✅ Generable con `node scripts/generate-secrets.mjs`. Validación en producción: ≥ 32 caracteres (el servidor aborta si no). 🟠 Setear el valor real antes de desplegar.
- [x] **ADMIN_PIN / ADMIN_PIN_HASH** ✅ La comparación es contra hash bcrypt (`auth.service.js`), nunca texto plano. `generate-secrets.mjs` genera el hash. Validación: exige hash bcrypt o PIN ≠ 1234 y ≥ 6 chars. 🟠 Setear valor real.
- [x] **CORS_ORIGINS** ✅ Validación: al menos un origen. 🟠 Configurar dominios reales.
- [x] **FRONTEND_URL** ✅ Validación añadida: obligatoria y `https://` en producción (se usa en magic-links y CORS). 🟠 Apuntar al dominio público real.
- [x] **OTP_DEBUG** ✅ Si está activo en producción, el backend emite un warn a consola (validación). 🟠 No activar (`0` o vacío).
- [x] **REFRESH_GRACE** ✅ Soportado (defecto 6h). 🟠 Ajustar según política de sesión.
- [x] **ENABLE_REMINDER_WORKER** ✅ Soportado (email/SMS según `sms_opt_in`). 🟠 Decidir si debe correr.
- [x] **Webhooks email/SMS** ✅ Soportan cabecera `Authorization: Bearer` (`EMAIL/SMS_WEBHOOK_HEADERS/TOKEN`). 🟠 Configurar y no commitear las claves.
- [x] **Google OAuth** ✅ Soportado (`GOOGLE_CLIENT_ID/SECRET/TOKENS_KEY`). 🟠 Configurar credenciales reales.
- [x] **No commitear `.env`/tokens** ✅ Solo `.env.example` y `.env.production.example` están trackeados; `.env` y `backups/` en `.gitignore`.

## Backend

- [x] **`pnpm test`** ✅ 31/32 suites, 150 tests pass (3 skip). La suite de integración con Postgres real corre en CI con `RUN_INTEGRATION=1`.
- [x] **PORT / DATABASE_URL** ✅ Validación `DATABASE_URL` postgres en producción. 🟠 Verificar valores del entorno.
- [x] **Logs sin secretos** ✅ Pino con `redact` (`authorization`, `token`, `pin`, `password`, `cookie`, `x-api-key`, `stripe-signature`) en `logger.js`.
- [x] **Rate limiting y CORS** ✅ Global 60/15min; `authLimiter` 10/15min; `otpLimiter` 30/15min; `refreshLimiter` 60/15min; plus view/analytics (`viewLimiter`).
- [x] **PIN vs hash bcrypt** ✅ `auth.service.js` usa `bcrypt.compare` (hash de `ADMIN_PIN_HASH` o derivado de `ADMIN_PIN`).
- [x] **OTP/magic-link** ✅ `timingSafeEqual` + códigos con hash SHA-256 (`customer-auth.service.js`).
- [x] **Webhook de pagos** ✅ Verifica firma `stripe-signature` con `stripeClient.webhooks.constructEvent`; si `STRIPE_WEBHOOK_SECRET` está configurado y falta/n la firma o el raw body, rechaza con 400.

## Frontend

- [x] **`apiUrl` del entorno** ✅ Dev: proxy `/api` → `http://localhost:3000` (`src/proxy.conf.json`, activado en `angular.json`). Prod: `__APP_CONFIG__.apiUrl`/nginx mismo origen.
- [x] **Build de producción** ✅ `pnpm exec ng build --configuration production` verde (PWA/SEO incluidos).
- [x] **`nginx.conf`** ✅ HSTS + CSP + cabeceras anti-sniffing; cache para estáticos; SPA fallback.

## Docker

- [x] **Variables de `docker-compose.yml`** ✅ Compose valida/inyecta vars (env_file + defaults); revisado.
- [x] **Volumen de PostgreSQL fuera de repositorio** ✅ `pgdata` (named volume) + `./backups` bind-mount, ambos fuera del control de versiones.
- [x] **Sin puertos innecesarios expuestos** ✅ `db` (5432) y `backend` (3000) bindeados a `127.0.0.1`; solo `frontend` (80) queda público.

## Producción

- [x] **Backend escucha solo en el puerto requerido** ✅ `PORT` (defecto 3000); en Docker solo alcanzable vía loopback del host.
- [x] **Copias de seguridad de la BD** ✅ Servicio `backup` (dump `pg_dump -Fc -Z9` diario a `./backups/`, retención 14 días) + `backend/scripts/restore.sh`. 🟠 Probar una restauración real en el servidor antes de ir a producción.
- [x] **HTTPS con reverse proxy/front door real** ✅ `nginx.conf` listo (HSTS incluido). 🟠 Aplicar TLS real en el despliegue (proxy/CDN de entrada) y abrir solo 443 externamente.

## Tareas operativas para el despliegue (resumen)

1. Ejecutar `node scripts/generate-secrets.mjs` y volcar `JWT_SECRET` + `ADMIN_PIN_HASH` en `backend/.env`.
2. Configurar `FRONTEND_URL`, `CORS_ORIGINS`, `STRIPE_WEBHOOK_SECRET`, credenciales Google/Sheets.
3. Verificar `OTP_DEBUG` apagado y `ENABLE_REMINDER_WORKER` según desees.
4. Abrir solo el puerto 443 y terminar TLS en el reverse proxy/front door.
5. Probar `docker compose run --rm backup` y `backend/scripts/restore.sh` en el servidor.