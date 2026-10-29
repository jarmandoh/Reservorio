# TODO de profesionalización — Reservorio

Lista priorizada de faltantes técnicos y operativos para mejorar la estabilidad y la preparación para producción. No duplica las funcionalidades de producto propuestas en [`mejoras-futuras.md`](../mejoras-futuras.md).

## P0 — Cerrar antes del siguiente despliegue estable

- [x] **Unificar Node.js y pnpm en todo el monorepo.** Se fijó pnpm 12.15.0 y Node.js 22.22.3, se alinearon CI, documentación, configuración del workspace y lockfiles, y el hook usa `pnpm`. Verificación: instalación congelada aprobada y comandos de ambos paquetes ejecutables sin auto instalación.
- [ ] **Dejar toda la suite verde desde un entorno limpio.** Ejecutar backend, frontend, integración con PostgreSQL y E2E con las variables de prueba documentadas. Evitar que los tests frontend dependan de un `.env` local o de APIs de navegador ausentes en jsdom. **Progreso:** `pnpm test` pasó con integración PostgreSQL activa (37 suites/178 tests backend; 19 archivos/67 tests frontend); la integración usa un `TEST_DATABASE_URL` restringido a `localhost/reservorio_test`, sin usar Supabase. Pasaron las coberturas backend y frontend; se alineó `@vitest/coverage-v8` con Vitest y se corrigió el mensaje de errores locales en `ApiService`. **Pendiente:** el build Angular termina con código 1 sin diagnóstico en este equipo y aún no se pudieron ejecutar E2E ni verificar todos los jobs en un runner limpio. **Cierre:** todos los jobs de CI pasan desde una clonación limpia y el pre-commit ejecuta la misma suite sin diferencias por máquina.
- [ ] **Hacer un simulacro de restauración de PostgreSQL.** Restaurar un backup reciente en staging, validar usuarios, reservas y pagos, y medir cuánto tarda la recuperación y cuántos datos se podrían perder. **Progreso:** los backups nuevos usan formato custom compatible, el restaurador prevalida el archivo y falla correctamente, y el runbook/registro están preparados. **Pendiente:** ejecutar en staging y registrar resultados reales de RPO/RTO y validación.
- [ ] **Completar la lista de salida a producción con valores reales.** Confirmar dominio, TLS, `FRONTEND_URL`, `CORS_ORIGINS`, secretos, proveedores de notificación, `OTP_DEBUG` apagado y destino/cifrado de backups. **Cierre:** checklist de [`SECURITY_CHECKLIST.md`](../SECURITY_CHECKLIST.md) completada para el entorno real y prueba de smoke de [`DEPLOY.md`](../DEPLOY.md) aprobada.

## P1 — Reducir riesgo operativo

- [ ] **Automatizar despliegue y smoke de staging.** Publicar una versión identificada por commit, aplicar el esquema y ejecutar pruebas de humo sobre el dominio de staging, y documentar cómo volver a la versión anterior. **Cierre:** una versión no llega a producción si fallan salud, login, reserva o checkout en modo de prueba.
- [ ] **Añadir alertas a las métricas existentes.** Conectar `/metrics` y health checks con un tablero y alertas de disponibilidad, latencia, errores 5xx, saturación de PostgreSQL/Redis, fallos de notificaciones y antigüedad del último backup. **Cierre:** cada alerta tiene umbral, responsable y pasos de diagnóstico; probar al menos una alerta en staging.
- [ ] **Automatizar la gestión de vulnerabilidades.** Ejecutar auditoría de dependencias y detección de secretos en cada PR; habilitar actualizaciones automáticas revisables. **Cierre:** vulnerabilidades críticas/altas bloquean el merge o tienen una excepción documentada con vencimiento.
- [ ] **Definir el contrato de la API.** Mantener una especificación OpenAPI alineada con rutas, autenticación, validaciones y errores; añadir validación o pruebas de contrato para endpoints críticos. **Cierre:** la especificación se revisa en CI y deja de depender de actualizar a mano páginas divergentes de `docs/API.md`.
- [ ] **Medir y proteger rendimiento y accesibilidad.** Añadir umbrales de Lighthouse/Core Web Vitals y pruebas de accesibilidad a CI para home, reserva, login y paneles en tamaños móviles y escritorio. **Cierre:** regresiones por encima de los umbrales fallan CI y los resultados quedan asociados al commit.

## P2 — Mejorar gobernanza del producto y los datos

- [ ] **Documentar el ciclo de vida de datos personales.** Definir retención, anonimización, solicitudes de exportación/borrado y tratamiento de copias de seguridad; comprobar el comportamiento con datos de prueba. **Cierre:** cada tipo de dato tiene plazo y procedimiento, incluida su expiración en backups, y el proceso queda reflejado en `/privacy` y documentación operativa.
- [ ] **Priorizar las funcionalidades de producto con métricas.** Elegir como máximo dos o tres elementos de la matriz A–J de [`mejoras-futuras.md`](../mejoras-futuras.md), vincularlos a una métrica (ocupación, conversión, recurrencia o retención) y revisar el resultado tras su lanzamiento. **Cierre:** cada iniciativa tiene responsable, criterio de éxito y decisión explícita de continuar o detener.

## Orden sugerido

1. Unificar herramientas y conseguir una suite limpia en verde.
2. Ensayar restauración y completar el checklist real del entorno.
3. Automatizar staging, smoke y rollback.
4. Añadir alertas, análisis de seguridad y presupuestos de calidad.
5. Cerrar el contrato API y las políticas de datos; luego priorizar producto.
