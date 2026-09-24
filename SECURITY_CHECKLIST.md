# Checklist de seguridad y despliegue

## Variables de entorno

- [ ] Cambiar `JWT_SECRET` por un valor aleatorio y fuerte.
- [ ] Cambiar `ADMIN_PIN` por un valor seguro en producción.
- [ ] Revisar `CORS_ORIGINS` para permitir solo dominios reales.
- [ ] Confirmar que `FRONTEND_URL` apunta al dominio público real (se usa en los magic-links).
- [ ] Confirmar que `OTP_DEBUG=1` **no** está activo en producción (expondría códigos one-time en las respuestas).
- [ ] Si usas webhooks de email/SMS (`EMAIL_WEBHOOK_URL`, `SMS_WEBHOOK_URL`), usar cabeceras con token Bearer (`*_WEBHOOK_HEADERS`) y no commitear las claves.
- [ ] Confirmar que `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_TOKENS_KEY` están bien configurados si se usa OAuth.
- [ ] No commitear `.env` ni tokens reales.

## Backend

- [ ] Ejecutar `pnpm test` antes de desplegar (26 suites / 111 tests).
- [ ] Verificar que `PORT` y `DATABASE_URL` sean correctos para el entorno.
- [ ] Confirmar que no hay logs con secretos o tokens.
- [ ] Revisar rate limiting y CORS en producción (global 60/15min; `authLimiter` 10/15min; `otpLimiter` 30/15min).
- [ ] Verificar que la verificación de OTP/magic-link usa `timingSafeEqual` y códigos one-time con hash SHA-256.
- [ ] Confirmar que el webhook de pagos verifica la firma (`stripe-signature`) antes de procesar el evento.

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
