# Checklist de seguridad y despliegue

## Variables de entorno

- [ ] Cambiar `JWT_SECRET` por un valor aleatorio y fuerte.
- [ ] Cambiar `ADMIN_PIN` por un valor seguro en producción.
- [ ] Revisar `CORS_ORIGINS` para permitir solo dominios reales.
- [ ] No commitear `.env` ni tokens reales.
- [ ] Confirmar que `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_TOKENS_KEY` están bien configurados si se usa OAuth.

## Backend

- [ ] Ejecutar `pnpm test` antes de desplegar.
- [ ] Verificar que `PORT` y `DATABASE_URL` sean correctos para el entorno.
- [ ] Confirmar que no hay logs con secretos o tokens.
- [ ] Revisar rate limiting y CORS en producción.

## Frontend

- [ ] Confirmar que el `apiUrl` del entorno apunta al dominio correcto.
- [ ] Validar el build con `pnpm exec ng build --configuration production`.
- [ ] Revisar `nginx.conf` para cabeceras y rutas de SPA.

## Docker

- [ ] Verificar las variables hechas por `docker-compose.yml`.
- [ ] Mantener el volumen de PostgreSQL fuera de repositorio.
- [ ] Revisar que no haya puertos innecesarios expuestos.

## Producción

- [ ] Revisar que el backend solo escuche en el puerto requerido.
- [ ] Hacer copias de seguridad de la BD antes de cambios grandes.
- [ ] Usar HTTPS con reverse proxy/front door real.
