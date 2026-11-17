# Diagnóstico de fricción en reserva y checkout

Este diagnóstico identifica pasos redundantes y puntos probables de abandono en el flujo actual. Se basa en la implementación; no atribuye tasas de abandono sin datos de analítica por etapa.

Para el recorrido completo y las rutas técnicas, ver [Flujo actual de reserva y checkout](./flujo-reserva-checkout.md).

## Límite de la evidencia

El embudo actual solo registra vistas de negocio, reservas creadas y pagos `paid`. No registra la selección de servicio u horario, el inicio de sesión, el envío del formulario, el inicio del checkout ni el retorno de la pasarela. Por tanto, los siguientes hallazgos son hipótesis de fricción sustentadas en el flujo, no mediciones de conversión.

## Hallazgos priorizados

| Prioridad | Punto                                          | Evidencia en el flujo                                                                                                                                  | Riesgo para la conversión                                                                                                | Siguiente validación                                                                        |
| --------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Alta      | Acceso tardío                                  | El cliente elige servicio y horario antes de saber que debe iniciar sesión. Al avanzar desde el horario, se redirige a `/usuario/auth`.                | La interrupción llega después de invertir tiempo y el retorno conserva solo la URL de reserva, no la selección en curso. | Medir `slot_selected → auth_redirect → booking_form_view`.                                  |
| Alta      | Reserva y pago son dos decisiones consecutivas | El paso 3 crea primero una reserva `pending`; el paso 4 pide elegir importe, método e iniciar checkout.                                                | Un cliente puede interpretar “Reserva enviada con éxito” como finalización y abandonar antes del cobro.                  | Medir `booking_created → payment_checkout_started` y segmentar por método.                  |
| Alta      | Éxito visual sin confirmación definitiva       | La página de retorno de éxito aparece tras la redirección; el estado final depende del webhook de la pasarela.                                         | Puede haber discrepancia temporal entre lo que el cliente ve y lo que persiste el sistema.                               | Medir y mostrar un estado “verificando pago” hasta recibir confirmación.                    |
| Media     | Repetición de confianza y promesa imprecisa    | El formulario muestra dos señales de “Pago seguro” y una afirma Stripe aunque el flujo permite transferencia, efectivo y una configuración sin Stripe. | Información repetida aumenta ruido; una promesa inexacta puede reducir confianza.                                        | Revisar el texto según método y disponibilidad real de pasarela.                            |
| Media     | Repetición de datos y consentimiento           | Aunque se precargan nombre y teléfono de la sesión, el formulario vuelve a exigir revisión y consentimiento en cada reserva.                           | Es un paso necesario por cumplimiento, pero puede sentirse repetitivo para clientes recurrentes.                         | Confirmar el requisito legal y evaluar un consentimiento informado persistente, si procede. |
| Media     | Disponibilidad cambiante al final del flujo    | La disponibilidad se refresca por SSE y cada 15 segundos; la selección se valida definitivamente al crear la reserva.                                  | El cliente puede llegar al formulario con una franja que otro cliente acaba de ocupar y recibir el error al enviar.      | Medir conflictos de franja y avisar de la actualización antes de pedir datos.               |

## Pasos redundantes detectados

### Señales de seguridad duplicadas

En el paso de datos aparecen un bloque “Pago 100% Seguro” y, debajo, una etiqueta “Pago seguro”. Mantener una sola señal contextual —junto al método elegido— libera espacio y evita afirmar que todos los pagos se procesan con Stripe.

### Confirmación dividida

El cliente confirma la reserva y, después, inicia el pago. La división es válida si se quiere permitir pago posterior, efectivo o transferencia, pero debe presentarse explícitamente como dos resultados posibles:

- **Reservar ahora y pagar después**, o
- **Reservar y pagar ahora**.

Sin esa decisión visible antes de crear el `booking`, el toast de reserva puede cerrar mentalmente el proceso antes del cobro.

### Datos recurrentes

El autocompletado reduce la carga, pero el cliente aún tiene que revisar nombre, teléfono y consentimiento. No debe eliminarse sin una decisión de privacidad; la oportunidad es dejar claro qué dato se reutiliza y por qué se solicita confirmar el consentimiento.

## Puntos de abandono por etapa

```text
Vista de negocio
  ├─ sin servicio disponible
  ├─ servicio elegido
  │   ├─ sin horario disponible
  │   └─ horario elegido → acceso obligatorio
  │       ├─ no inicia sesión / no regresa
  │       └─ formulario y consentimiento
  │           ├─ franja ya tomada
  │           └─ reserva creada
  │               ├─ no inicia checkout
  │               ├─ transferencia / efectivo pendiente
  │               └─ pasarela → éxito, cancelación o fallo
```

Los puntos con mayor incertidumbre son el retorno después del acceso, el salto entre reserva y pago, y la confirmación real tras la pasarela.

## Instrumentación mínima para confirmar el diagnóstico

Antes de rediseñar, registrar eventos sin datos personales y con `businessId`, método de pago cuando aplique y marca de tiempo:

1. `service_selected`
2. `slot_selected`
3. `auth_redirected` y `auth_returned`
4. `booking_submit_started`, `booking_created` y `booking_conflict`
5. `payment_method_selected` y `payment_checkout_started`
6. `payment_returned_success`, `payment_returned_cancel` y `payment_webhook_confirmed`

Con esos eventos se podrá cuantificar cada transición sin almacenar nombre, teléfono, notas ni datos de pago.

## Decisiones todavía abiertas

- Si el pago debe ser obligatorio para dejar la reserva creada.
- Si el acceso debe solicitarse antes de elegir una franja o conservar explícitamente la selección tras autenticarse.
- Qué consentimiento debe confirmarse en cada reserva conforme a la política aplicable.
- Qué estado debe ver el cliente mientras llega la confirmación del webhook.
