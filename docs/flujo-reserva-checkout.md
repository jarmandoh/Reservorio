# Flujo actual de reserva y checkout

Este documento describe el recorrido que implementa hoy Reservorio para reservar un servicio y pagar. Está dirigido a producto, soporte y desarrollo; describe el comportamiento existente, no una propuesta de rediseño.

## Alcance

Incluye el flujo público desde la elección de un servicio hasta el inicio o resolución del pago. No cubre la administración de agendas, reembolsos manuales ni el catálogo de productos.

## Resumen

```text
Servicio → horario → acceso de cliente → datos + consentimiento
  → reserva pendiente → elección de importe y método → checkout
  → webhook o instrucciones → estado del pago
```

La reserva se crea antes del pago. Por eso un pago cancelado o pendiente no borra la reserva: queda pendiente para que el cliente pueda reintentarlo o el negocio la gestione.

## Recorrido del cliente

| Etapa             | Pantalla/comportamiento                                                                                                                                | Requisito para continuar                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| 1. Servicio       | El cliente elige un servicio del negocio. Se muestran precio, duración y filtros visuales.                                                             | Servicio seleccionado.                                                        |
| 2. Horario        | Se consulta disponibilidad al cargar, mediante SSE y cada 15 segundos mientras la pestaña está visible. Las franjas ocupadas no se pueden seleccionar. | Franja disponible seleccionada.                                               |
| 3. Acceso y datos | Si el cliente no tiene sesión, se redirige al acceso y vuelve a la reserva. El formulario exige nombre, teléfono válido y consentimiento de datos.     | Sesión de cliente y formulario válido.                                        |
| 4. Reserva        | Se crea la reserva y se muestra el estado **Listo**. El cliente puede elegir método de pago e importe completo o anticipo del 30 %.                    | Respuesta correcta con `bookingId` y `customerId`.                            |
| 5. Pago           | Tarjeta y PayPal abren la pasarela; transferencia y efectivo muestran instrucciones sin redirección.                                                   | El backend valida acceso a la reserva y calcula el importe desde el servicio. |

## Operaciones del backend

### Crear la reserva

`POST /api/businesses/:id/checkout` requiere una sesión de cliente y una cabecera `Idempotency-Key`.

El backend, en una transacción:

1. comprueba que el negocio existe;
2. crea la franja con estado `Reservado`;
3. usa el cliente autenticado;
4. crea un `booking` con estado `pending`;
5. crea notificaciones para negocio y cliente;
6. responde con `bookingId`, `customerId` y `reservationId`.

Una clave repetida devuelve el resultado original; una operación aún en curso responde con `Retry-After: 1`. Si la franja ya fue tomada, responde con conflicto y la interfaz recarga la disponibilidad.

### Iniciar el pago

`POST /api/payments/checkout` requiere autenticación y acceso a la reserva. También usa `Idempotency-Key`.

El importe no se toma como fuente de verdad del navegador: el backend consulta el precio activo del servicio. Con `deposit: true` calcula el 30 %; de lo contrario usa el importe completo. Crea o reutiliza un pago `pending`.

- **Tarjeta / PayPal:** con Stripe configurado devuelve una URL de Checkout y el navegador redirige allí. Si Stripe no está configurado, el backend devuelve una sesión de desarrollo sin URL de redirección.
- **Transferencia:** devuelve beneficiario, banco, referencia y moneda.
- **Efectivo:** devuelve la instrucción de pagar al completar el servicio.

Las URL de retorno solo se aceptan si pertenecen a `FRONTEND_URL` y terminan exactamente en `/payment/success` o `/payment/cancel`.

### Confirmar el pago

`POST /api/payments/webhook` procesa la notificación de la pasarela. Cuando Stripe está configurado, exige y verifica `stripe-signature`. Este es el mecanismo que actualiza el estado persistido del pago a `paid`, `failed` o `refunded` y genera la notificación correspondiente.

Las páginas `/payment/success` y `/payment/cancel` muestran el resultado de la redirección al usuario. La primera no debe interpretarse por sí sola como prueba de que el pago ya se confirmó en la base: la confirmación definitiva proviene del webhook.

## Estados y mensajes visibles

| Situación                             | Estado o feedback actual                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------ |
| Servicio, horario o datos incompletos | No permite avanzar; el formulario marca campos tocados al intentar enviar.     |
| Cliente sin sesión                    | Mensaje de inicio de sesión y redirección al acceso con URL de retorno.        |
| Reserva creada                        | Toast de éxito y paso `Listo`; la franja se marca localmente como `Reservado`. |
| Franja ya tomada o error de reserva   | Toast de error y recarga de disponibilidad.                                    |
| Pago iniciándose                      | Estado de carga y botón deshabilitado mediante `paymentLoading`.               |
| Transferencia o efectivo              | Toast de éxito e instrucciones visibles.                                       |
| Error al iniciar pago                 | Toast con el mensaje del backend o texto genérico.                             |
| Pago cancelado                        | Página que indica que la reserva queda pendiente y se puede reintentar.        |

## Componentes, servicios y rutas implicados

| Pieza                                                    | Responsabilidad                                                            |
| -------------------------------------------------------- | -------------------------------------------------------------------------- |
| `frontend/src/app/features/booking/booking.component.ts` | Flujo de cuatro pasos, validaciones, idempotencia en navegador y checkout. |
| `frontend/src/app/core/services/api.service.ts`          | Cliente HTTP de disponibilidad, reserva y pago.                            |
| `backend/src/routes/businesses.routes.js`                | Disponibilidad y creación de la reserva del checkout.                      |
| `backend/src/services/checkout.service.js`               | Transacción de reserva, booking y notificaciones.                          |
| `backend/src/routes/payments.routes.js`                  | Inicio del checkout y recepción del webhook.                               |
| `backend/src/services/payments.service.js`               | Cálculo seguro del importe, pasarela, idempotencia y transiciones de pago. |

## Verificación de esta documentación

La descripción se contrastó con los componentes y rutas indicados arriba. Antes de cambiar el flujo, actualizar este documento y conservar la separación entre crear la reserva y confirmar el pago.
