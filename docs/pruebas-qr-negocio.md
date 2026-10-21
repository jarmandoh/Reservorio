# Datos de prueba — código QR de negocios

Este documento sirve para validar el QR mostrado en la página pública de cada negocio.

## Datos rápidos

| Campo | Valor |
| --- | --- |
| Frontend local | `http://localhost:4200` |
| Ruta pública | `/business/:businessId` |
| Negocio de prueba existente | `reservorio-test-business` |
| URL de prueba | `http://localhost:4200/business/reservorio-test-business` |
| Logo usado por defecto | [`frontend/src/assets/imgs/reservorio-logo.jpg`](../frontend/src/assets/imgs/reservorio-logo.jpg) |

El QR debe contener exactamente esta URL cuando se pruebe con el negocio incluido en los datos de prueba:

```text
http://localhost:4200/business/reservorio-test-business
```

## Negocio con UUID de prueba

Para comprobar que el identificador funciona como UUID, usa este valor en un negocio de desarrollo:

```text
550e8400-e29b-41d4-a716-446655440000
```

La URL esperada será:

```text
http://localhost:4200/business/550e8400-e29b-41d4-a716-446655440000
```

No uses este UUID en producción.

## Pruebas manuales

### 1. Carga inicial

1. Inicia el backend y el frontend.
2. Abre [`http://localhost:4200/business/reservorio-test-business`](http://localhost:4200/business/reservorio-test-business).
3. Confirma que la tarjeta **Su código QR** aparece en el lado derecho.
4. Comprueba que el QR tiene el logo de Reservorio en el centro.
5. Escanea el QR desde otro dispositivo o usa una aplicación de lectura de QR.
6. Confirma que abre la misma URL pública del negocio.

### 2. Ocultar y mostrar

1. Pulsa el botón `×` de la tarjeta.
2. Confirma que la tarjeta desaparece.
3. Confirma que aparece el botón flotante `QR`.
4. Pulsa `QR` y confirma que la tarjeta vuelve a mostrarse.
5. Repite la prueba usando solamente teclado: `Tab`, `Enter` y `Espacio`.

### 3. Personalización de marca

1. Pulsa **Personalizar con el logo del negocio**.
2. Confirma que aparece el aviso de que la función requiere el **Plan de marca**.
3. Confirma que no se realiza ningún cobro ni redirección de pago.

La integración de cobro todavía no está definida porque el proyecto no tiene un precio ni un producto de pago para esta personalización.

### 4. Responsive

Comprueba la página en estas resoluciones:

| Resolución | Resultado esperado |
| --- | --- |
| `1440 × 900` | Tarjeta fija en el lado derecho, sin tapar el contenido principal. |
| `768 × 1024` | Tarjeta visible y usable junto al contenido. |
| `390 × 844` | Tarjeta anclada abajo, con ancho adaptado a la pantalla. |

### 5. Caso de error

Desactiva temporalmente el acceso de red a `api.qrserver.com` y recarga la página. Debe mostrarse el mensaje:

```text
No pudimos cargar el código QR. Intenta actualizar la página.
```

## Datos que deben cambiar entre negocios

Para dos negocios distintos, el QR debe ser diferente porque cambia el `businessId`:

```text
http://localhost:4200/business/reservorio-test-business
http://localhost:4200/business/550e8400-e29b-41d4-a716-446655440000
```

El logo central es el mismo para todos los negocios hasta que se contrate y conecte el Plan de marca.
