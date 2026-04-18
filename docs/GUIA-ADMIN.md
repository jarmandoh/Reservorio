# Guía para administradores — Reservorio

Esta guía está dirigida a los administradores de cada negocio registrado en Reservorio. Aquí aprenderás a acceder a tu panel, gestionar las reservaciones de tus clientes y administrar los servicios que ofreces.

---

## 1. Acceso al panel de tu negocio

1. Abre la aplicación en tu navegador.
2. En la página de inicio, busca tu negocio y haz clic en él.
3. Dentro de la página de tu negocio, selecciona la opción **"Administrar"** o accede directamente a `/business-login/<id-de-tu-negocio>`.
4. Ingresa tu **PIN** de administrador y haz clic en **Ingresar**.

> Si no recuerdas tu PIN o nunca lo has configurado, contacta al administrador global del sistema.

Una vez dentro, verás el panel con dos secciones principales: **Reservaciones** y **Servicios**.

---

## 2. Ver y gestionar reservaciones

### Ver la lista de reservaciones

Al entrar al panel verás todas las reservaciones de tu negocio en una tabla con las siguientes columnas:

| Columna | Descripción |
|---|---|
| **Franja horaria** | Hora o bloque de tiempo reservado |
| **Estado** | Estado actual de la reservación |
| **Cliente** | Nombre de quien realizó la reserva |
| **Teléfono** | Número de contacto del cliente |
| **Servicio** | Servicio solicitado |
| **Notas** | Observaciones adicionales del cliente |

### Estados de una reservación

| Estado | Significado |
|---|---|
| **Disponible** | La franja está libre, puede ser reservada por un cliente |
| **Pendiente** | El cliente hizo la reserva pero aún no fue confirmada |
| **Reservado** | La franja está ocupada |
| **Confirmado** | La reservación fue confirmada por el administrador |

### Confirmar una reservación

1. Localiza la reservación en la tabla.
2. Haz clic en el botón de acción correspondiente (ícono de check o botón **Confirmar**).
3. El estado cambiará a **Confirmado**.

### Cancelar o liberar una franja

1. Localiza la reservación que deseas cancelar.
2. Haz clic en el botón **Cancelar** o cambia el estado a **Disponible**.
3. La franja quedará disponible para nuevas reservaciones.

### Agregar notas a una reservación

Puedes escribir observaciones internas (visibles solo para el administrador) al confirmar o actualizar una reservación. Solo escribe en el campo **Notas** antes de guardar el cambio.

---

## 3. Gestionar servicios

Los servicios son las opciones que aparecen en el formulario de reserva para que tus clientes elijan. Por ejemplo: "Cancha Fútbol 5", "Corte de cabello", "Masaje deportivo".

### Ver servicios actuales

En el panel, ve a la pestaña o sección **Servicios**. Verás la lista de servicios configurados para tu negocio.

### Agregar un servicio

1. Escribe el nombre del nuevo servicio en el campo de texto.
2. Haz clic en **Agregar**.
3. El servicio aparecerá en la lista de inmediato y estará disponible en el formulario de reserva para tus clientes.

> Los nombres de servicios no pueden superar los 100 caracteres y no pueden repetirse.

### Eliminar un servicio

1. Localiza el servicio en la lista.
2. Haz clic en el ícono de eliminar (papelera) junto al servicio.
3. Confirma la acción si el sistema lo solicita.

> Eliminar un servicio no afecta las reservaciones ya existentes que lo tenían asignado.

---

## 4. Cambiar el PIN de tu negocio

Para cambiar tu PIN de acceso debes solicitarlo al **administrador global** del sistema, quien tiene permisos para actualizar los datos de cada negocio.

> Por seguridad, no compartas tu PIN con personas no autorizadas. El PIN se almacena de forma encriptada y no puede ser recuperado, solo restablecido.

---

## 5. Cierre de sesión

Tu sesión se mantiene activa durante **8 horas** desde el último inicio de sesión. Después de ese tiempo, deberás ingresar tu PIN nuevamente.

Para cerrar sesión manualmente, busca la opción **Cerrar sesión** en el menú de tu panel.

---

## Preguntas frecuentes

**¿Por qué no puedo confirmar una reservación?**  
Asegúrate de haber iniciado sesión con el PIN de tu negocio. Si el botón de confirmar no responde, tu sesión puede haber expirado — vuelve a iniciar sesión.

**¿Un cliente puede reservar una franja que aparece como "Disponible"?**  
Sí. Todas las franjas con estado **Disponible** son visibles y reservables desde la página pública de tu negocio.

**¿Puedo crear franjas horarias desde el panel?**  
Actualmente las franjas se crean como reservaciones con estado **Disponible**. Contacta al administrador global para configurarlas inicialmente.

**¿Quién puede ver los datos de mis clientes (nombre, teléfono)?**  
Solo tú como administrador de tu negocio y el administrador global del sistema tienen acceso a esa información.
