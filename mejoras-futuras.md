# Mejoras futuras para el proyecto Reservorio

Este documento recoge una lista de mejoras para implementar en fases posteriores, priorizando crecimiento, UX, estabilidad y escalabilidad.

## 1. Mejorar el flujo de reserva ✅
- Hacer el proceso más claro y guiado: servicio → horario → datos → pago → confirmación.
- Reducir la fricción en cada paso.
- Añadir mensajes de ayuda y validaciones más amigables.

## 2. Mejorar la confirmación visual del estado ✅
- Mostrar estados como: Pendiente, Confirmado, Pagado, Cancelado, Rechazado.
- Usar badges, iconos y colores distintivos por estado.
- Mostrar la referencia de la reserva en cada pantalla relevante.

## 3. Añadir pago con feedback claro ✅
- Hacer visible la diferencia entre “reserva creada” y “pago completado”.
- Mostrar mensaje antes, durante y después del pago.
- Añadir pantalla de éxito y cancelación con resumen útil.

## 4. Mejorar la comparación de servicios ✅
- Mostrar precio, duración, detalle, disponibilidad y requisitos.
- Añadir filtros por tipo de servicio, precio y horario.
- Priorizar servicios recomendados según demanda.

## 5. Añadir notificaciones automáticas ⚠️ (parcial)
- ✅ Notificaciones internas para proveedores (panel + automáticas al crear reserva, confirmar/cancelar y al cobrar).
- ✅ Recordatorios del evento (endpoint `/notifications/reminder`).
- ⬜ Confirmación por email.
- ⬜ Mensajes opcionales por WhatsApp o SMS.

## 6. Mejorar la experiencia móvil ✅
- Botones más grandes y cómodos para usar con una mano (min-height 48px en `.btn-primary`, `.btn-secondary`, `.form-input`/`.form-select`; `.btn-sm` con 40px).
- Touch targets correctos: `.btn-tertiary` 44px, `.btn-danger` 48px, `.payment-option` 60px mínimo.
- `-webkit-tap-highlight-color: transparent` y feedback táctil (`:active` con scale) en botones.
- Formularios más simples y menos campos innecesarios.
- Menos scroll y menos elementos visuales pesados.

## 7. Añadir trust signals para aumentar conversiones ✅
- Reseñas y calificaciones.
- Verificación del negocio.
- Seguridad en pagos.
- Políticas de cancelación o reembolso.

## 8. Mejorar la gestión de disponibilidad real ✅
- Evitar reservas duplicadas (índices únicos parciales en `reservations` y `bookings` → 409 en doble reserva).
- Actualizar disponibilidad en tiempo real.
- Bloquear horarios ocupados automáticamente.

## 9. Mejorar el panel del proveedor ✅
- Agrupar reservas por estado, día y servicio.
- Permitir confirmar, rechazar o contactar al cliente (acciones rápidas + WhatsApp).
- Añadir filtros rápidos y dashboard de resumen.

## 10. Añadir analytics y métricas de negocio ✅
- Tasa de reserva.
- Tasa de pago.
- Abandono por paso.
- Servicios más demandados.
- Horarios con mayor ocupación.

## 11. Mejorar la escalabilidad de la arquitectura ✅
- Separar mejor servicios, repositorios y validaciones.
- Preparar la app para crecimiento en número de negocios, reservas y usuarios.
- Revisar caché, consultas y límites de base de datos.

## 12. Preparar integración con más canales de pago ✅
- ✅ Stripe (pago con tarjeta, checkout estándar).
- ✅ PayPal vía Stripe (`payment_method_types: ['paypal']`).
- ✅ Transferencia bancaria real: `/payments/checkout` devuelve instrucciones (beneficiario/IBAN/banco desde env) y registra el pago como pendiente.
- ✅ Pago en efectivo en el local: mismo flujo con instrucciones de pago al completar el servicio.
- ✅ Reservas con anticipo: toggle en el paso de pago que cobra el 30% del total.
- ⬜ A plazos reales (p.ej. 3/6 cuotas) pendiente de definir proveedor.

## 13. Añadir gestión de clientes y historial ✅
- ✅ Ver reservas pasadas: `GET /customers/:id/history` (bookings + negocio + estado) y búsqueda `GET /customers/email/:email`.
- ✅ Repetir servicios frecuentes: botón "Repetir tu última reserva" en el flujo de reserva + prefill automático de datos de contacto.
- ✅ Guardar preferencias e historial de contacto (última reserva por negocio en localStorage).
- ⬜ Panel de cliente completo (login propio y vista de historial en la app).

## 14. Añadir panel administrativo avanzado ✅
- ✅ Estadísticas globales del marketplace (`/admin/stats`: negocios, clientes, reservas, ingresos, reseñas, rating medio).
- ✅ Gestión de proveedores y servicios (tab Negocios existente + `/admin/services` para lista/servicios globales con eliminación).
- ✅ Moderación de contenido: reseñas (`/admin/reviews` + DELETE) y pagos (`/admin/payments` con cambio de estado pendiente→cobrado→reembolsado).
- Todos los endpoints bajo `/api/admin` con `requireAdmin` (JWT role `admin`).

## 15. Mejorar la seguridad y cumplimiento ✅
- Auditar tokens, sesiones y permisos (JWT fijado a HS256, rate limiting estricto en auth/PIN).
- Revisar validaciones del backend (validators + sanitize + límite de body 10kb).
- Añadir logs estructurados y alertas (JSON por request, /metrics con status codes, X-Request-Id).
- Preparar requisitos para producción y cumplimiento legal (validación de config en arranque; GDPR pendiente).

## 16. Añadir sincronización local opcional ✅
- ✅ Caché offline de lecturas públicas (negocios, disponibilidad, servicios, reseñas, rating) en localStorage con señal online/offline.
- ✅ Banner de "sin conexión" con revalidación automática al reconectar.
- ⬜ PWA completa con service worker (offline-first real) pendiente.

## 17. Mejorar la documentación técnica y de producto ✅
- Documentar endpoints REST (backend/README.md + docs/API.md).
- Documentar flujos clave de negocio.
- Añadir guía de instalación y despliegue.
- Definir convenciones de trabajo en equipo.

## 18. Mejorar la apariencia y branding visual ✅
- ✅ Unificar colores, tipografías y componentes visuales (tokens `brand`/`success`/`info`, fondo degradado coherente, tipografía Inter + font-display).
- ✅ Identidad más clara: título "Reservorio", meta description, favicon SVG y `theme-color` en `index.html`.
- ✅ Migrados los hexes de plantillas a tokens: azules de hero (`brand-light`/`brand-sky`), gradientes (`from-primary to-primary-container`, `via-primary`), estados (`success`/`error`/`tertiary`) y built-ins (amber/orange/green). Solo quedan literales fuera: fondo artístico del booking y gradientes SVG del logo.

## 19. Añadir soporte para marketplace multi-proveedor ✅
- Diferenciar claramente clientes y proveedores.
- Permitir que cada negocio tenga su propio catálogo y disponibilidad.
- Tener una vista global del marketplace.

## 20. Preparar despliegue y operaciones reales ✅
- Variables de entorno bien definidas (.env.example, .env.production.example).
- Backups automatizados (scripts/backup.sh con pg_dump + retención + cron).
- Monitoreo de errores y rendimiento (/health, /metrics, logs JSON con X-Request-Id).
- Pipeline CI/CD para despliegue seguro (.github/workflows/ci.yml).

## Prioridad recomendada

### Fase 1: UX y conversión
- ✅ Flujo de reserva
- ✅ Confirmación visual
- ✅ Pago con feedback claro
- ✅ Trust signals

### Fase 2: Operación y negocio
- ✅ Panel del proveedor
- ⚠️ Notificaciones (internas ✅; email/WhatsApp pendientes)
- ✅ Gestión de disponibilidad
- ✅ Analytics

### Fase 3: Escalabilidad y producción
- ✅ Seguridad
- ✅ Monitoreo
- ✅ Marketplace multi-proveedor
- ✅ Despliegue y documentación

## Resumen

La prioridad más importante ahora mismo es mejorar la confianza del usuario desde que busca un servicio hasta que completa el pago y recibe la confirmación. Eso suele tener el mayor impacto directo en conversión y percepción de calidad.

### 23092026
B. Mejoras pendientes (de mejoras-futuras.md)
#6 Experiencia móvil: filas de la tabla de reservas demasiado anchas en móvil, botones < 44px.
#12 Canales de pago: PayPal hoy se envía como payment_method_types:['paypal'] a Stripe (parcial); falta transferencia real, anticipo/plazos.
#13 Gestión de clientes e historial: no existe panel de cliente (reservas pasadas, repetir servicio, preferencias).
#14 Panel admin avanzado: faltan estadísticas globales del marketplace y moderación de reseñas/pagos.
#5 Canales de notificación: email/SMS/WhatsApp + recordatorios automáticos (hoy el endpoint /reminder no se agenda).
#16 Sincronización local/offline (PWA).
#18 Branding: unificar tokens visuales (se mezclan Material Icons/Tailwind/componentes propios).
C. Calidad y mantenibilidad
Unificar APIs duplicadas: providers.* vs businesses.* exponen los mismos recursos con contratos distintos.
Eliminar el patrón "catch → memoria" en services (bookings/payments/notifications): en producción debe loggear y fallar, no silenciar.
Tipar: loadNotifications devuelve any[] ✓ ya existe NotificationItem.
Memory leaks: subscribe sin takeUntilDestroyed en varios componentes (peticiones que resuelven tras OnDestroy).
Cobertura de tests: faltan tests de integración con BD real (Docker) — el bug #2 y #3 no se detectan con los tests actuales (DB mockeada).
Observabilidad: /metrics solo cuenta en proceso; añadir media móvil de latencia (p95).

### 23092026 (tarde)
Completadas en backend + frontend:
 #6 experiencia móvil (touch targets 44–60px, feedback táctil).
 #12 canales de pago: transferencia real, efectivo, PayPal y anticipo del 30%.
 #13 historial de cliente por API + repetición de última reserva.
 #14 panel admin: estadísticas, moderación de reseñas y pagos.
 #16 caché offline de lecturas públicas + banner de conexión.
 #18 branding: tokens visuales, título, favicon y theme-color.
Verificación: build Angular OK y 83 tests backend PASS (24 suites).

### 23092026 (noche)
C. Calidad y mantenibilidad ✅ (completada)
 - ✅ APIs duplicadas unificadas: `providers.routes.js` ahora es alias de `businesses.routes.js` (ruta canónica única); se eliminó `provider.controller.js`.
 - ✅ Patrón "catch → memoria" eliminado en bookings/payments/notifications services: sin `DATABASE_URL` lloggea error y devuelve 500; `createNotification` se mantiene fire-and-forget. `customers.service.js` conserva su fallback (fuera de scope).
 - ✅ `loadNotifications` tipado con `NotificationItem` en `api.service.ts` y `business-admin.service.ts`.
 - ✅ Memory leaks: `takeUntilDestroyed` en subscribe de componentes (app, owner-register/business-login/owner-login, owner-dashboard, booking, business-admin, admin). Polling en booking/business-admin y home se conservan con limpieza manual (ya existente).
 - ✅ Tests de integración con BD real (Docker) para bugs #2/#3: `test/real-business.routes.test.js` gateado por `RUN_INTEGRATION='1'` + `DATABASE_URL` postgres; `docker-compose.test.yml` (test-db en :5434) + script `test:integration`. Verificación local: 23 suites PASS, 1 skipped (integración), 82 tests PASS.
 - ✅ Observabilidad: /metrics con media móvil de latencia (p50/p95/p99, ventana 10 min) + test de verificación.
Verificación: build Angular OK y 82 tests backend PASS (23 suites + 1 skip de integración).




