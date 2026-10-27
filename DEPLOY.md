# Despliegue en producción

Reservorio corre como procesos nativos: Node.js para la API, PostgreSQL administrado o instalado en el host y Nginx/Caddy para servir el frontend y terminar TLS.

## 1. Preparar el servidor

Instala Node.js `22.22.3`, Corepack/pnpm `12.15.0`, PostgreSQL 16, Nginx y Caddy. Redis es opcional; sin `REDIS_URL`, el backend usa almacenamiento en memoria y no comparte límites de solicitudes entre réplicas.

Clona el repositorio en `/opt/reservorio` y prepara la configuración:

```bash
cd /opt/reservorio
corepack enable
pnpm install --frozen-lockfile
cp .env.production.example backend/.env
chmod 600 backend/.env
```

Ajusta `backend/.env`: credenciales reales de `DATABASE_URL`, `JWT_SECRET`, `ADMIN_PIN_HASH`, `CORS_ORIGINS`, `FRONTEND_URL`, `FRONTEND_HOST`, proveedores de notificaciones y `OTP_DEBUG=0`. No guardes este archivo en Git.

## 2. Inicializar y actualizar la base

Para una base nueva y vacía, carga el esquema inicial una vez y luego aplica las migraciones:

```bash
cd /opt/reservorio/backend
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/init.sql
pnpm db:migrate
```

No vuelvas a ejecutar `init.sql` sobre una base existente. Para versiones posteriores, crea un backup, ejecuta `pnpm db:migrate` y reinicia la API.

## 3. Mantener la API en ejecución

El repositorio incluye `deploy/reservorio-backend.service` para systemd. Requiere que el código esté en `/opt/reservorio` y Node.js en `/usr/bin/node`:

```bash
sudo cp deploy/reservorio-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now reservorio-backend
```

El servicio carga `backend/.env` mediante la aplicación, aplica migraciones antes de iniciar y se reinicia si el proceso falla. Comprueba `sudo systemctl status reservorio-backend` y `curl -fsS http://127.0.0.1:3000/health`.

## 4. Publicar el frontend y TLS

Compila y publica los archivos estáticos:

```bash
cd /opt/reservorio
pnpm --filter frontend build
sudo mkdir -p /var/www/reservorio/frontend
sudo rsync -a --delete frontend/dist/frontend/browser/ /var/www/reservorio/frontend/
sudo cp frontend/nginx.conf /etc/nginx/sites-available/reservorio
sudo ln -sfn /etc/nginx/sites-available/reservorio /etc/nginx/sites-enabled/reservorio
sudo nginx -t && sudo systemctl reload nginx
```

`frontend/nginx.conf` sirve el sitio en `127.0.0.1:8080` y enruta `/api` al backend local. Configura el servicio de Caddy del host con el `Caddyfile` del repositorio, `FRONTEND_HOST` en su entorno y DNS apuntando al servidor. Caddy termina TLS en los puertos 80/443 y reenvía al Nginx local. En el firewall deja públicos solo 80/443; mantén PostgreSQL, Redis y el puerto 3000 accesibles solo desde el host o la red privada.

Prueba:

```bash
curl -fsS http://127.0.0.1:3000/health
curl -fsSI https://tu-dominio.com/
curl -fsS https://tu-dominio.com/api/businesses
```

El backend debe responder `ok: true` y `database: connected`.

## 5. Actualizar una versión

Desde `/opt/reservorio`, crea primero un backup y luego:

```bash
git pull --ff-only
pnpm install --frozen-lockfile
pnpm --filter reservorio-backend db:migrate
pnpm --filter frontend build
sudo rsync -a --delete frontend/dist/frontend/browser/ /var/www/reservorio/frontend/
sudo systemctl restart reservorio-backend
sudo systemctl reload nginx
```

Verifica salud, login, reserva y checkout en modo de prueba antes de anunciar la versión.

## 6. Backups y restauración PostgreSQL

Programa `backend/scripts/backup.sh` en cron o en el planificador del sistema. El script crea dumps custom compatibles con `pg_restore`, conserva 14 días por defecto y permite configurar `BACKUP_DIR` y `RETENTION`.

Ejemplo para ejecutarlo manualmente:

```bash
cd /opt/reservorio/backend
BACKUP_DIR=/var/backups/reservorio ./scripts/backup.sh
```

Protege el directorio de backups y configura una copia fuera del servidor; el script `backend/scripts/backup-offsite.sh` permite sincronizar con S3 mediante rclone o AWS CLI.

Haz simulacros únicamente contra una base staging aislada. Detén su backend y proporciona las URLs de destino y mantenimiento:

```bash
sudo systemctl stop reservorio-backend
RESTORE_DATABASE_URL='postgres://usuario:clave@host:5432/reservorio_staging' \
MAINTENANCE_DATABASE_URL='postgres://usuario:clave@host:5432/postgres' \
DB_NAME=reservorio_staging \
  bash backend/scripts/restore.sh /var/backups/reservorio/backup.dump
sudo systemctl start reservorio-backend
```

El restaurador pide confirmación, comprueba el dump antes de borrar la base, se detiene ante errores y muestra conteos de owners, clientes, reservas, bookings y pagos. Registra fecha, backup usado, commit, RPO, RTO, conteos comparados y smoke de API en [docs/RESTORE_DRILL.md](docs/RESTORE_DRILL.md). No lo apuntes a producción durante un simulacro.

## 7. Seguridad y release smoke

- Mantén `CORS_ORIGINS` limitado a dominios reales y `OTP_DEBUG=0`.
- Usa `ADMIN_PIN_HASH`, secretos fuertes y webhooks de email/SMS autenticados.
- Verifica que PostgreSQL y Redis no estén expuestos públicamente.
- El dominio canónico por defecto es `https://reservorio.app`; si cambia, actualiza `CANONICAL_ORIGIN`, `frontend/src/index.html`, `robots.txt` y `sitemap.xml`.
- El frontend es SPA cliente; sus rutas de reserva y pago no deben indexarse.
- Usa checkout en modo de prueba y no completes pagos reales durante el smoke.

Para smoke de staging:

```bash
cd /opt/reservorio/frontend
PLAYWRIGHT_SKIP_SERVER=1 PLAYWRIGHT_BASE_URL=https://staging.tu-dominio.com \
  pnpm exec playwright test --project=chromium-smoke --project=chromium-a11y
```

Registra fecha, commit, resultados y URL de staging; confirma TLS, rutas profundas, `robots.txt`, `sitemap.xml`, cabeceras y disponibilidad de la API.
