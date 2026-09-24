# Mejoras y recomendaciones — Reservorio

Documento vivo: cada mejora marcada con ✅ indica trabajo completado y verificado. Las entradas sin marcar son el listado propuesto de mejoras y recomendaciones, ordenado por prioridad.

---

## Estado actual (resumen)

- **Backend**: Node 22 + Express 5 + PostgreSQL 16. **26 suites / 111 tests** (jest, `--runInBand`).
- **Frontend**: Angular 22 (Standalone + Signals) + Tailwind 3 + GSAP + Leaflet. Build OK, specs Karma/Jasmine + e2e Playwright.
- **CI**: `.github/workflows/ci.yml` → tests backend + build frontend en cada push/PR.
- **Docs**: `README.md`, `backend/README.md`, `frontend/README.md`, `docs/API.md`, `docs/DEVELOPERS.md`, `docs/GUIA-ADMIN.md`, `SECURITY_CHECKLIST.md`, `DEPLOY.md`.

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

---

## Próximas mejoras y recomendaciones

### Alta prioridad (estabilidad y fundamento)

- [ ] **Migraciones SQL versionadas** — Hoy `backend/db/init.sql` es la única fuente de verdad y solo corre en contenedores nuevos. Adoptar `node-pg-migrate` (o similar) con migraciones numeradas para evolucionar el schema en producción sin pérdida de datos.
- [ ] **Renovación/refresh de tokens** — Los JWT expiran (2 h admin, 8 h el resto) y hay que volver a autenticarse. Implementar un flujo de renovación (refresh token opaco o re-emitido) y reintentos automáticos en `api.service.ts` ante `401`.
- [ ] **Recordatorios agendados** — Existe `POST /notifications/reminder`, pero el disparo no está programado. Añadir un worker/cron (en el backend o un contenedor `cron`) que agende y dispare recordatorios (24 h antes, por email/SMS teniendo en cuenta `sms_opt_in`).
- [ ] **Tests de integración con Postgres real en CI** — La suite gateada por `RUN_INTEGRATION=1` (+ `docker-compose.test.yml`) no corre en CI. Añadir un *service container* de PostgreSQL al workflow para que cubra los bugs de reglas SQL (doble reserva, cascade).
- [ ] **PIN de administración con hash** — `authenticateAdmin` compara `ADMIN_PIN` en claro. Migrar a `bcrypt` (con re-emisión de hash si cambia) igual que los PINs de negocio.

### Media prioridad (operación y calidad)

- [ ] **Paginación en listados** — `bookings`, `payments`, `customers` y el historial devuelven todo sin límite. Añadir `LIMIT/OFFSET` + cursor y paginación en el frontend.
- [ ] **Logging estructurado con pino** — Los logs JSON por request ya existen; reemplazar `console.error` dispersos por un logger estructurado con niveles y contexto (`requestId`).
- [ ] **Docker multi-stage para el backend** — Imagen actual incluye `devDependencies`/fuentes. Usar stage de build para reducir tamaño y superficie de ataque.
- [ ] **E2E Playwright más amplios y en CI** — Hoy hay un spec básico y no corre en GitHub Actions. Cubrir los flujos clave (login, reserva, panel admin) y ejecutarlos en el workflow.
- [ ] **Runner de specs unificado** — `vitest` está en `devDependencies` pero sin config (se usa Karma/Jasmine). Decidir: configurar vitest y migrar specs, o eliminar la dependencia.
- [ ] **i18n** — Textos hardcodeados en español. Si se opera en varios mercados, preparar `@angular/localize` desde ya para no penalizar el futuro.
- [ ] **Modo oscuro** — Activar `darkMode: 'class'` en Tailwind y cubrir al menos home, booking y paneles.
- [ ] **Exportar reservas a CSV** — Botón en `BusinessAdminComponent` para descargar las reservaciones del día/semana.
- [ ] **Backoff en solicitudes OTP** — `otpLimiter` limita por IP; añadir backoff exponencial o token-bucket por email para endurecer el anti-spam sin fricción para usuarios legítimos.

### Baja prioridad / mejoras de producto

- [ ] **PWA offline-first real** — La caché offline es de lecturas; completar con Service Worker (Angular `service-worker`), manifiesto e instalación.
- [ ] **SEO** — `sitemap.xml`, `robots.txt`, datos estructurados (JSON-LD de local business) y páginas de negocio con metadatos propios.
- [ ] **Cumplimiento/GDPR** — Consentimiento explícito en el alta de clientes (email/phone), exportar y borrar datos (`DELETE /customers/:id` con autenticación), y política de privacidad.
- [ ] **Seguridad del sandbox Nginx** — Cabeceras adicionales (HSTS, CSP) y directiva `server_tokens off`.
- [ ] **Backup agendado y restaurado** — `scripts/backup.sh` existe; añadir cron en Docker y probar la restauración al menos una vez.
- [ ] **Gráficas de conversión en el panel admin** — Embudo por paso (vista → reserva → pago) usando los datos de analytics ya recolectados.
- [ ] **Página 404 personalizada** — Hoy el wildcard `**` redirige a `/`. Una NotFound con enlaces útiles mejora UX y SEO.
- [ ] **Limpieza de deuda menor** — Ganchos de control en `git` (lint/prettier), `EditorConfig`/`.vscode/extensions.json`, y revisión de dependencias sin uso (p. ej., decidir destino de `vitest`).

---

## Prioridad recomendada

1. **Fundamento**: migraciones versionadas + refresh de tokens + PIN de admin con hash.
2. **Automatización**: worker de recordatorios + tests de integración en CI.
3. **Operación**: pino, paginación, Docker multi-stage, limpieza de deuda.
4. **Producto**: PWA, SEO y cumplimiento GDPR.

> Regla del proyecto: cada mejora que se implemente debe actualizar este documento (✅ + nota de verificación) y, si afecta API/despliegue, también `docs/API.md`, `DEPLOY.md` o `SECURITY_CHECKLIST.md` según corresponda.