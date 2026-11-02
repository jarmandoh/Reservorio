# Hardening — SOC 2 / ISO 27001 / ISO 27701

Mapa de controles implementados y pendientes para MiVeci (Reservorio).

## 1. Controles técnicos implementados

### Autenticación y control de acceso (ISO 27001 A.9, SOC 2 CC6)
- JWT firmado (HS256) con expiración; refresh token rotation.
- Supabase Auth para clientes/propietarios; PIN + allowlist (`FIREBASE_ADMIN_EMAILS`/admin claim) para admin.
- Middlewares `requireAuth`, `requireAdmin`, `requireOwnerAuth`, `requireCustomer`, `requireAdminOrOwner`, `requireBusinessAuth` con RLS por negocio.
- Rate limiting global (60 req/15 min) + limiters específicos por ruta (auth, PIN, analytics).
- Validación de entrada con `express-validator` + sanitización (`sanitize.js`).
- CORS estricto (orígenes permitidos configurables, validación en producción).
- Trust proxy configurable para X-Forwarded-For correcto tras nginx.

### Criptografía (ISO 27001 A.10)
- Contraseñas con bcrypt (cost 10).
- PINs de negocio con hash bcrypt.
- HTTPS obligatorio en producción (HSTS max-age 1 año, includeSubDomains, preload).
- Tokens en `Authorization: Bearer` (no en query string).

### Cabeceras de seguridad (SOC 2 CC6.1, ISO 27001 A.13)
- `helmet` con CSP, HSTS, Referrer-Policy, Permissions-Policy.
- CSP: `default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`.
- Permissions-Policy: camera/microphone/geolocation deshabilitados.

### Seguridad operativa (ISO 27001 A.12)
- Logging estructurado (pino) con niveles configurables.
- Auditoría estructurada `[AUDIT]` con redacción de PII (passwords, tokens, emails enmascarados) en `middleware/audit.js`.
- Eventos auditados: login/register de propietario, exportación y supresión de datos.
- Compresión gzip + caché de assets.

### Desarrollo seguro (ISO 27001 A.14)
- Validación de entrada en todas las rutas.
- Sanitización de strings (`clean`).
- Idempotency keys para operaciones críticas.
- Tests automatizados (Jest backend 176, Vitest frontend 66).

### Privacidad / PIMS (ISO 27701, GDPR)
- Consentimiento explícito (`dataConsent`, `marketingConsent`) en creación de clientes.
- Endpoints DSAR: `GET /api/privacy/export`, `DELETE /api/privacy/account`.
- Redacción de PII en logs de auditoría.
- Política de privacidad publicada en `/privacy`.
- Minimización: solo se solicitan datos necesarios (nombre, email, teléfono opcional).

## 2. Controles organizativos (pendientes de implementación formal)

- [ ] Política de gestión de accesos (alta/baja/modificación) documentada.
- [ ] Revisión periódica de accesos (trimestral).
- [ ] Plan de respuesta a incidentes (IRP) con tiempos de notificación (72h GDPR).
- [ ] Plan de continuidad de negocio (BCP) y recuperación ante desastres (DRP).
- [ ] Gestión de proveedores (Supabase, Vercel, Cloudflare) con SLAs.
- [ ] Formación de seguridad para el equipo.
- [ ] Inventario de activos y clasificación de información.
- [ ] Gestión de vulnerabilidades (npm audit en CI, SAST/DAST).
- [ ] Copias de seguridad cifradas y probadas (scripts `backup.sh`, `restore.sh`).
- [ ] Gestión de cambios (PRs, revisiones, CI/CD).

## 3. Pendientes técnicos (backlog)

- [ ] Mover tokens de `localStorage` a cookies `httpOnly + Secure + SameSite` para mitigar XSS.
- [ ] CSRF protection para cookies (si se migra a cookies).
- [ ] Rotación automática de JWT signing keys.
- [ ] Cifrado en reposo para datos sensibles (PII en DB).
- [ ] MFA para administradores y propietarios.
- [ ] Alertas de seguridad (intentos fallidos, accesos anómalos).
- [ ] Retención y purga automática de datos (ISO 27701).
- [ ] Tests de seguridad (OWASP ZAP / DAST en CI).
- [ ] `npm audit` en pipeline CI con bloqueo por severidad high/critical.

## 4. Verificación

- Backend tests: 176 passed.
- Frontend tests: 66 passed.
- Build: OK.

Última actualización: 2026-11-01.
