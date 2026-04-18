# SETUP — Reservorio con Google Sheets

## 1. Hacer pública la hoja de cálculo (lectura)

1. Abre la hoja: https://docs.google.com/spreadsheets/d/1cxZR6YYFkXJy8AKGM-1AakGk9hw6AR9vTv2RHm4yUNc/edit
2. Menú **Compartir** → "**Cualquier persona con el enlace puede ver**"
3. Esto permite la lectura desde la app sin autenticación.

---

## 2. Estructura de la hoja "Reservas"

La primera hoja debe llamarse **Reservas** (o Sheet1) con estos encabezados en la fila 1:

| A              | B               | C       | D         | E         | F     |
|----------------|-----------------|---------|-----------|-----------|-------|
| Franja horaria | Disponibilidad  | Cliente | Teléfono  | Servicio  | Notas |

### Valores de Disponibilidad reconocidos
- `Disponible` — franja libre (se mostrará como seleccionable)
- `Reservado` — ocupada
- `Pendiente` — reservada pero no confirmada
- `Confirmado` — reserva confirmada

---

## 3. Hoja "Servicios" (opcional)

Crea una segunda hoja llamada **Servicios** con los nombres de servicios en la columna A (sin encabezado, o con encabezado "Servicio"):

```
Masaje Terapéutico
Corte de Cabello
Manicura
...
```

---

## 4. Desplegar Apps Script Web App (para escritura)

Para que el usuario pueda enviar reservas y el admin confirmarlas, necesitas desplegar un Web App:

### 4.1 Abrir el editor de Apps Script

En la hoja de cálculo: **Extensiones → Apps Script**

### 4.2 Pegar el código

Borra el contenido del editor y pega el contenido del archivo `Code.gs` (incluido en este proyecto).

### 4.3 Desplegar

1. Clic en **Implementar → Nueva implementación**
2. Tipo: **Aplicación web**
3. Descripción: `Reservorio API`
4. Ejecutar como: **Yo** (tu cuenta)
5. Quién tiene acceso: **Cualquier persona** *(para permitir requests desde la app)*
6. Clic en **Implementar** → copia la URL

### 4.4 Configurar la URL

Abre `admin.html` → pestaña **Ajustes** → pega la URL en el campo "Apps Script Web App".

---

## 5. Flujo de la aplicación

```
Usuario (index.html)
  │
  ├─ Lee franjas y disponibilidad (Google Sheets API pública)
  ├─ Elige franja + servicio + llena datos
  └─ Envía reserva → Apps Script Web App → escribe en la hoja

Admin (admin.html)
  │
  ├─ PIN de acceso (por defecto: 1234, cámbialo en Ajustes)
  ├─ Ve todas las columnas: franja, disp., cliente, teléfono, servicio, notas
  ├─ Filtra por estado y busca
  ├─ Confirma o cancela reservas → Apps Script Web App → actualiza hoja
  └─ Gestiona lista de servicios
```

---

## 6. Notas de seguridad

- El PIN del admin se guarda en `localStorage` del navegador. Es una protección básica.
- El Apps Script Web App valida los campos antes de escribir.
- No se almacena ningún dato sensible en el cliente más allá de la sesión.
- La hoja de cálculo es la fuente única de datos.
