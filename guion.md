# Checklist de mejoras para Reservorio

Marca cada tarea al completarla. Las estimaciones son iniciales y deben ajustarse tras revisar el alcance técnico.

## Priorización

| Orden | Mejora                          | Impacto | Esfuerzo   |
| ----: | ------------------------------- | ------- | ---------- |
|     1 | Flujo de reserva y checkout     | Alto    | Medio      |
|     2 | Seguridad y validación backend  | Alto    | Medio      |
|     3 | Accesibilidad crítica           | Alto    | Medio      |
|     4 | Rendimiento de carga            | Alto    | Medio      |
|     5 | SEO y datos estructurados       | Medio   | Medio      |
|     6 | Analítica y observabilidad      | Medio   | Medio      |
|     7 | Soporte offline / PWA           | Medio   | Medio      |
|     8 | Mantenibilidad y deuda técnica  | Medio   | Bajo-Medio |
|     9 | Refinamientos secundarios de UX | Bajo    | Bajo       |

## Checklist por prioridad

### 1. Flujo de reserva y checkout

- [x] Documentar el flujo actual de reserva y pago. Ver `docs/flujo-reserva-checkout.md`.
- [x] Identificar pasos redundantes y puntos de abandono. Ver `docs/diagnostico-friccion-reserva-checkout.md`.
- [ ] Simplificar el flujo sin perder información necesaria.
- [ ] Mostrar estados claros de carga, éxito y error.
- [ ] Mejorar los mensajes de validación y error.
- [ ] Añadir confirmación previa al pago.
- [x] Mostrar el importe exacto en la acción de pago, también al elegir anticipo u otro método.
- [ ] Verificar el feedback al usuario en cada etapa.

### 2. Seguridad y validación backend

- [ ] Revisar validación y saneamiento de entradas en endpoints críticos.
- [ ] Revisar sesiones y manejo de tokens.
- [ ] Verificar rate limiting en autenticación, reservas y pagos.
- [ ] Comprobar idempotencia en pagos y reservas.
- [ ] Revisar que los errores no expongan información sensible.

### 3. Accesibilidad crítica

- [ ] Comprobar navegación por teclado en los flujos principales.
- [ ] Asegurar que el foco sea visible y siga un orden lógico.
- [ ] Hacer accesibles los mensajes de error y cambios de estado.
- [ ] Verificar contraste y legibilidad en pantallas prioritarias.
- [ ] Revisar semántica y etiquetas de formularios y diálogos.

### 4. Rendimiento de carga

- [ ] Medir la carga inicial y el rendimiento de las páginas principales.
- [ ] Optimizar imágenes de inicio y páginas de detalle.
- [ ] Aplicar carga diferida a contenido y módulos no críticos.
- [ ] Añadir skeletons o placeholders donde mejoren la percepción de carga.
- [ ] Revisar tiempos de interacción y corregir los cuellos de botella principales.

### 5. SEO y datos estructurados

- [ ] Definir títulos y descripciones por negocio y servicio.
- [ ] Añadir metadatos Open Graph para compartir páginas.
- [ ] Incorporar y validar datos estructurados JSON-LD pertinentes.
- [ ] Revisar previews sociales y metadata de páginas públicas.

### 6. Analítica y observabilidad

- [ ] Definir los eventos del funnel: visita, selección, reserva, pago y abandono.
- [ ] Instrumentar los eventos evitando recopilar datos personales innecesarios.
- [ ] Registrar errores funcionales relevantes.
- [ ] Crear un dashboard básico de conversión y errores.
- [ ] Revisar métricas periódicamente y priorizar problemas observados.

### 7. Soporte offline / PWA

- [ ] Mostrar claramente el estado de conectividad.
- [ ] Definir qué contenido se puede consultar sin conexión.
- [ ] Comunicar qué acciones no están disponibles sin conexión.
- [ ] Verificar la instalación y el comportamiento de la app como PWA.

### 8. Mantenibilidad y deuda técnica

- [ ] Identificar servicios y validaciones duplicados.
- [ ] Consolidar lógica compartida donde reduzca duplicación.
- [ ] Revisar modelos repetidos y aclarar sus responsabilidades.
- [ ] Añadir o mejorar pruebas de reservas, pagos y errores críticos.
- [ ] Eliminar componentes o estados redundantes relacionados con estos cambios.

### 9. Refinamientos secundarios de UX

- [ ] Unificar estados visuales de botones, formularios y tarjetas.
- [ ] Pulir interacciones de hover y focus sin depender solo del color.
- [ ] Mejorar el feedback visual de acciones importantes.
- [ ] Revisar consistencia visual en las páginas principales.

## Roadmap 30/60/90 días

### Días 0–30: conversión y riesgo

- [ ] Completar las tareas prioritarias de reserva y checkout.
- [ ] Revisar seguridad y validaciones de los endpoints críticos.
- [ ] Corregir barreras de accesibilidad en los flujos principales.
- [ ] Medir y mejorar la carga inicial de home y detalle.
- [ ] Verificar los resultados con pruebas de los flujos críticos.

### Días 31–60: crecimiento y confianza

- [ ] Completar metadata y datos estructurados de páginas públicas.
- [ ] Instrumentar eventos clave del funnel.
- [ ] Publicar métricas básicas de conversión y errores.
- [ ] Mejorar comportamiento y comunicación cuando no hay conexión.
- [ ] Revisar formularios, estados vacíos y feedback de errores.

### Días 61–90: sostenibilidad y escala

- [ ] Reducir duplicación en servicios y validaciones.
- [ ] Ampliar pruebas automatizadas para reservas, pagos y errores clave.
- [ ] Refinar consistencia de componentes y estados visuales.
- [ ] Revisar métricas y definir el siguiente ciclo de mejoras.

## Ejecución por sprints

### Sprint 1 — Conversión y estabilidad

**Objetivo:** aumentar la finalización de reservas y reducir fricción.

- [ ] Documentar el flujo actual de reserva.
- [ ] Mapear puntos de abandono en el checkout.
- [ ] Simplificar pasos redundantes.
- [ ] Añadir confirmación previa al pago.
- [ ] Mejorar errores y validaciones en frontend.
- [ ] Revisar validaciones backend de endpoints clave.
- [ ] Corregir accesibilidad de pantallas prioritarias.
- [ ] Optimizar imágenes y contenido pesado de home y detalle.
- [ ] Validar el flujo completo mediante pruebas.

### Sprint 2 — Seguridad, confianza y datos

**Objetivo:** proteger las operaciones y medir el comportamiento del usuario.

- [ ] Revisar autenticación y seguridad de pagos.
- [ ] Validar rate limiting e idempotencia.
- [ ] Definir e implementar eventos clave de analítica.
- [ ] Crear métricas o dashboard básico del funnel.
- [ ] Mejorar metadata, Open Graph y JSON-LD.
- [ ] Añadir indicadores de conectividad y estados offline.
- [ ] Verificar manejo de errores para que no exponga datos sensibles.

### Sprint 3 — Mantenibilidad y refinamiento

**Objetivo:** preparar el producto para crecer con menos regresiones.

- [ ] Consolidar servicios duplicados.
- [ ] Revisar validaciones repetidas entre frontend y backend.
- [ ] Añadir pruebas para reserva, pago y errores clave.
- [ ] Limpiar estados y componentes redundantes.
- [ ] Pulir interacciones visuales y consistencia global.
- [ ] Revisar resultados y priorizar el siguiente ciclo de trabajo.

## Criterios de cierre

- [ ] Las tareas completadas tienen pruebas o verificación documentada.
- [ ] Los cambios del flujo de reserva no rompen pagos ni confirmaciones.
- [ ] Las mejoras de accesibilidad se verificaron con teclado.
- [ ] El rendimiento y las métricas se compararon con una línea base.
- [ ] Los cambios de SEO se validaron en páginas públicas representativas.
