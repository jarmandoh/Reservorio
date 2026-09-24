# Frontend — Reservorio

Aplicación web de **Reservorio** construida con **Angular 22** (Standalone Components), **Tailwind CSS 3**, **GSAP** y **Leaflet**. Servida en producción por Nginx.

## Requisitos

- Node.js `>=22.22.3`
- pnpm `>=9.15.0`

## Puesta en marcha

```bash
pnpm install
pnpm start              # ng serve → http://localhost:4200
pnpm build              # build de producción → dist/frontend
pnpm test               # specs con Karma/Jasmine
pnpm e2e                # test e2e con Playwright
```

El proxy de desarrollo (`angular.json`) redirige `/api/*` a `http://localhost:3000/api`.

## Configuración de la API

`src/environments/environment.ts` resuelve la URL base así:

```ts
apiUrl: window.__APP_CONFIG__?.apiUrl ?? 'http://localhost:3000/api'  // dev
apiUrl: window.__APP_CONFIG__?.apiUrl ?? '/api'                       // prod
```

En Docker, `docker-compose.yml` inyecta `API_URL` en el HTML servido, lo que permite apuntar al dominio real sin recompilar.

## Estructura

```
src/app/
├── app.component.*                # Shell raíz (router-outlet + ToastComponent)
├── app.config.ts                  # provideRouter + provideHttpClient
├── app.routes.ts                  # featureRoutes (de features/routes.ts)
├── core/
│   ├── guards/                    # admin, owner, business, customer
│   ├── models/                    # business, categorias, reservation
│   ├── services/                  # api, auth, storage, session.store, toast, offline,
│   │                              #   admin, owner-business, business-admin, business
│   └── state/session.store.ts     # Estado reactivo global (signals)
├── shared/components/             # badge, pin-auth-card, map-modal, business-form, toast
└── features/
    ├── home/                      # Listado público de negocios
    ├── booking/                   # Formulario de reserva del cliente
    ├── login/                     # Login del administrador global (PIN)
    ├── admin/                     # Panel global: CRUD de negocios
    ├── business-login/            # Login por PIN del negocio
    ├── business-admin/            # Panel del negocio + bulk-slot-generator
    ├── owner-register|login|dashboard/  # Flujo de dueños
    ├── customer-login/            # Login de cliente (email/teléfono + OTP + magic-link)
    ├── customer-magic-verify/     # Canje del magic-link desde el email
    ├── customer-history/          # Panel "Mi cuenta" del cliente
    └── payment-success|cancel/    # Confirmación/cancelación de pago
```

## Rutas

| Ruta | Componente | Guard |
|---|---|---|
| `/` | Home | — |
| `/booking/:businessId` | Booking | — |
| `/login` | Login | — |
| `/admin` | Admin | admin |
| `/business/:businessId/login` | BusinessLogin | — |
| `/business/:businessId/admin` | BusinessAdmin | business |
| `/owner/business/:businessId` | BusinessAdmin | owner |
| `/owner/register`, `/owner/login`, `/owner/dashboard` | Owner flow | dashboard: owner |
| `/customer/login`, `/customer/history`, `/customer/verify` | Cliente | history: customer |
| `/payment/success`, `/payment/cancel` | Pagos | — |

## Almacenamiento de tokens (`auth.service.ts`)

| Clave | Contenido | Almacenamiento |
|---|---|---|
| `reservorio_admin_jwt` | JWT admin global | sessionStorage |
| `reservorio_owner_jwt` | JWT dueño | sessionStorage |
| `negocio_jwt_<businessId>` | JWT business-admin | sessionStorage |
| `reservorio_customer_jwt` | JWT cliente (persistente) | localStorage |
| `reservorio_unlocked` | Flag legacy de sesión | sessionStorage |
| `reservorio_admin_pin` | PIN legacy | localStorage |

`isTokenValid()` verifica la expiración en el cliente decodificando el payload del JWT.

## Convenciones

- Standalone Components (sin `NgModule`), `inject()` en lugar de constructor.
- Estado reactivo con **Signals** (`signal`, `computed`) — ver `session.store.ts`.
- Interfaces de datos en `core/models`.