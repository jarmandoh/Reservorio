# Autenticación con Supabase en Reservorio

Esta rama integra Supabase Auth con el backend Express y las sesiones actuales de Reservorio. Angular usa la publishable key pública; el backend valida cada access token contra `GET /auth/v1/user` y resuelve el rol con datos internos. Nunca se expone una secret/service-role key.

## Roles y reglas de asignación

- **customer**: el registro de cliente conserva sus datos en `customers`. Puede registrarse con contraseña opcional, Google, OTP o magic link. Al autenticar por primera vez, `GET /api/auth/me` resuelve o crea su perfil interno.
- **owner**: el registro crea el perfil de negocio mediante el endpoint existente y luego la identidad de Supabase. El inicio de sesión acepta contraseña, Google y OTP. El backend vincula por email con la fila ya existente en `owners`; no se concede el rol por metadatos editables.
- **admin**: puede mantener el PIN validado por backend, o usar Google/OTP con un usuario al que un administrador haya asignado `app_metadata.role = "admin"` desde un entorno confiable.
- **business-admin**: conserva su PIN por negocio y su JWT limitado a `businessId`; no se convierte automáticamente en owner.

Los roles no se eligen desde el formulario. La API comprueba el rol real en cada ruta protegida; los guards Angular son solo una capa de navegación.

## Flujos implementados

| Tipo de usuario | Contraseña | Google | Código email (OTP) | Magic link |
|---|---:|---:|---:|---:|
| Cliente | Sí, opcional al registrarse | Sí | Sí | Sí |
| Propietario | Sí | Sí | Sí | Servicio disponible |
| Administrador | PIN por API; Auth password disponible | Sí | Sí | Servicio disponible |

- OAuth y enlaces de correo vuelven a `/auth/callback` o `/customer/verify`.
- El callback llama a `GET /api/auth/me` y redirige según el rol que resuelve el backend.
- `AuthService.logout()` cierra la sesión local y la sesión de Supabase.
- Las cuentas antiguas de propietarios deben migrarse/invitarse en Supabase Auth con el mismo email antes de iniciar sesión; no se usa el login legacy como bypass de la confirmación de correo.

## Configuración del proyecto Supabase

Proyecto usado por defecto en los environments:

- URL: `https://afgoyjoasxjnsliblsde.supabase.co`
- La publishable key está en `environment.ts` y `environment.prod.ts`; es pública por diseño y puede reemplazarse mediante `window.__APP_CONFIG__`.
- En el backend define `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` en las variables de entorno del hosting.

### Proveedor Email

1. Supabase → Authentication → Sign In / Providers → Email: habilita email/password y OTP.
2. Para que la pantalla de código funcione, en Authentication → Email Templates → Magic Link usa una plantilla que incluya `{{ .Token }}`, por ejemplo:

   ```html
   <h2>Tu código de acceso a Reservorio</h2>
   <p>Introduce este código para continuar: <strong>{{ .Token }}</strong></p>
   ```

3. Configura SMTP de producción para la entrega fiable de correos. La entrega de emails de prueba de Supabase tiene límites.
4. La plantilla Magic Link puede usar el enlace de confirmación de Supabase; mantén configurada la URL de retorno permitida.

### Proveedor Google

1. En Google Cloud Console crea un OAuth Client ID de tipo Web.
2. En Supabase → Authentication → Sign In / Providers → Google, activa el proveedor y copia Client ID y Client Secret.
3. En Google Cloud, agrega como Authorized redirect URI la URL callback que muestra Supabase para el proveedor. Para este proyecto será:
   `https://afgoyjoasxjnsliblsde.supabase.co/auth/v1/callback`
4. Activa Google en Supabase y guarda los cambios.

### URLs permitidas

En Supabase → Authentication → URL Configuration:

- Site URL: `https://reservorio.app`
- Redirect URLs:
  - `http://localhost:4200/auth/callback`
  - `http://localhost:4200/customer/verify`
  - `https://reservorio.app/auth/callback`
  - `https://reservorio.app/customer/verify`

Añade las URLs exactas de cualquier dominio adicional de preview o producción. Supabase solo redirige a destinos permitidos.

## Variables del backend

Añade en el hosting/backend:

```env
SUPABASE_URL=https://afgoyjoasxjnsliblsde.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

No uses `SUPABASE_SERVICE_ROLE_KEY` en Angular ni como sustituto de la publishable key para validar sesiones. No subas credenciales privadas al repositorio.

## Roles de administración

Para habilitar a un administrador en Supabase, un administrador de proyecto debe asignar `app_metadata.role = "admin"` usando Dashboard o una operación server-side confiable. Nunca lo pongas en `user_metadata`, porque el usuario puede editar esos metadatos. Después de cambiar `app_metadata`, el usuario debe renovar su sesión para recibir los claims actualizados.

## Seguridad y RLS

La API de Reservorio conserva acceso a PostgreSQL mediante su conexión backend y establece el contexto RLS interno antes de consultar. No se añadieron políticas genéricas a las 21 tablas existentes con RLS porque eso podría exponer datos de clientes, reservas, pagos o negocios. Antes de habilitar acceso directo a esas tablas desde el navegador, hay que diseñar políticas específicas de propiedad y relación para cada tabla y verificar los permisos de Data API.

La tabla `user_profiles` creada previamente mantiene RLS y la política de lectura del perfil propio. No contiene secretos ni sustituye la tabla de perfiles de negocio.

## Verificación manual recomendada

1. Crear un cliente sin contraseña: debe recibir OTP y entrar a `/customer/history`.
2. Crear un cliente con contraseña: confirmar el email si el proyecto exige confirmación y probar acceso por contraseña.
3. Iniciar sesión de cliente con Google y comprobar que vuelve a `/auth/callback`.
4. Crear un propietario y confirmar el email antes de entrar a `/owner/dashboard`.
5. Probar propietario con contraseña, OTP y Google.
6. Probar administrador con PIN backend y, si está asignado en `app_metadata`, con OTP o Google.
7. Intentar usar una sesión de cliente en una ruta de propietario/admin: la API debe responder 403.
8. Cerrar sesión y confirmar que Supabase elimina la sesión persistida.

La activación de Google y el SMTP son tareas del Dashboard del proyecto; no pueden completarse desde el código del repositorio.
