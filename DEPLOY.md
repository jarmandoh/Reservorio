# Despliegue en producción

## 1. Preparar el entorno

1. Copia la plantilla:

   ```bash
   copy .env.production.example .env.production
   ```

2. Ajusta los valores sensibles en `.env.production`:
   - `JWT_SECRET`
   - `ADMIN_PIN`
   - `DATABASE_URL`
   - `CORS_ORIGINS`
   - `FRONTEND_URL` (dominio público real — se usa en los magic-links de cliente)
   - `EMAIL_PROVIDER` / `EMAIL_WEBHOOK_URL` (+ `EMAIL_WEBHOOK_HEADERS` con el token) y `SMS_*` si se envían notificaciones
   - `OTP_DEBUG` debe quedar vacío o `0` (¡nunca `1` en producción!)
   - Google OAuth y Apps Script si se usan

> No subas este archivo a Git ni lo compartas en repositorios públicos.

## 2. Levantar la aplicación

Desde la raíz del proyecto:

```bash
docker compose --env-file .env.production up --build -d
```

Esto levanta:
- PostgreSQL
- Backend
- Frontend servido con Nginx

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
- Cambia el valor por defecto de `ADMIN_PIN` antes del despliegue.
- Verifica que `OTP_DEBUG` no esté activo y que los webhooks de email/SMS usen token Bearer.
- Revisa periódicamente los logs del backend y del contenedor.

## 5. Actualizaciones

Para desplegar cambios nuevos:

```bash
docker compose --env-file .env.production pull
docker compose --env-file .env.production up --build -d
```

## 6. Backup de la base de datos

```bash
docker compose exec db pg_dump -U reservorio reservorio > backup.sql
```

## 7. Reset rápido

```bash
docker compose down -v
```

> Solo usa esto si quieres borrar completamente los datos de la base de datos.
