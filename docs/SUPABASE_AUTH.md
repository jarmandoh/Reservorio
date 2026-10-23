# Autenticación con Supabase en Reservorio

Reservorio usa Supabase Auth para validar identidades y conserva la base de datos de negocio existente. El navegador solo usa la **publishable key**. La API valida cada access token con `GET /auth/v1/user` antes de resolver el rol y el ID interno.

## Roles y asignación

- **customer**: se crea el registro interno en `customers` al primer acceso válido. Se admite email/password, Google, OTP y magic link.
- **owner**: el email autenticado debe existir previamente en `owners`. El alta de propietario sigue el flujo administrativo de creación de owner; no se permite que el cliente elija el rol.
- **admin**: se asigna exclusivamente en `app_metadata.role = "admin"`, desde un contexto administrativo confiable (Dashboard/servidor). Nunca usar `user_metadata` para conceder permisos.
- **business-admin**: mantiene su autenticación PIN específica por negocio y sus permisos por `businessId`.

El backend ejecuta la resolución inicial bajo el contexto RLS interno `auth`; después, el middleware instala el contexto correspondiente al rol ya verificado.

## Métodos disponibles en el cliente Angular

El servicio `SupabaseAuthService` expone:

- `signInWithPassword(email, password)`
- `signUp(email, password, name)`
- `signInWithGoogle(redirectTo)`
- `signInWithOtp(email)` + `verifyEmailOtp(email, token)`
- `signInWithMagicLink(email, redirectTo)`
- `getSession()` y `signOut()`

Los guards existentes `adminGuard`, `ownerGuard`, `customerGuard` y `businessGuard` continúan protegiendo las rutas. La API también valida el rol; un guard del navegador nunca sustituye la autorización del servidor.

## Configuración

1. En Supabase → Authentication → Sign In / Providers, habilita Email y Google.
2. En Authentication → URL Configuration, define Site URL y añade las URLs exactas de retorno:
   - `http://localhost:4200/customer/verify`
   - `https://TU-DOMINIO/customer/verify`
   - la ruta de retorno de OAuth que use la pantalla de login.
3. Para Google, crea un OAuth Client ID de tipo Web en Google Cloud. Configura como Authorized redirect URI la URL de callback que muestra el proveedor Google de Supabase. Copia Client ID y Client Secret en la configuración del proveedor Google de Supabase.
4. Configura el runtime del frontend (`window.__APP_CONFIG__`) con:
   - `supabaseUrl=https://afgoyjoasxjnsliblsde.supabase.co`
   - `supabasePublishableKey=sb_publishable_...`
5. En `backend/.env`, define `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` con los mismos valores públicos. Reinicia el backend.

No configures `service_role` ni una secret key en el frontend. Para los administradores, concede `app_metadata.role=admin` desde el servidor o Dashboard; jamás desde un formulario público.

## Nota sobre OTP y magic link

Supabase utiliza el mismo método `signInWithOtp`: sin `emailRedirectTo` envía un código que se canjea con `verifyEmailOtp`; con `emailRedirectTo` envía un enlace de acceso. Configura las plantillas de email para incluir el token/código correspondiente. El proveedor Email debe estar habilitado y tener SMTP configurado para producción.
