# Graph Report - Reservorio  (2026-10-16)

## Corpus Check
- 251 files · ~147,045 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2054 nodes · 3568 edges · 150 communities (87 shown, 63 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 170 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Modelo: reservation
- Rutas y guards frontend
- Servicio: offline
- Panel del negocio propietario
- Pruebas: pagination.test
- Servicio: customer auth
- Panel de administración
- Servicio: auth
- Módulo: index
- Configuración: angular
- Servicio: owner business
- API: businesses
- Servicio: api
- Componente: home
- Servicio: auth
- Pruebas: businesses.routes.test
- Módulo: cache
- Módulo: gen icons
- Servicio: businesses
- Componente: booking
- Configuración: tsconfig
- Servicio: toast
- Servicio: business admin
- Pruebas: test
- Configuración: package
- API: categories
- API: google
- API: auth
- API: products
- Configuración: package
- Módulo: business
- Servicio: admin
- API: services
- Servicio: googleSheets
- Servicio: admin
- Pruebas: notifications.routes.test
- Configuración: package
- Servicio: payments
- Pruebas: gdpr.test
- Configuración: package
- Configuración: package
- Componente: customer history
- Configuración: turbo
- API: reservations
- Módulo: currency
- Configuración: package
- Servicio: reminders.worker
- Servicio: customers
- Servicio: realtime
- Servicio: bookings
- Servicio: notifications
- Pruebas: real business.routes.test
- Módulo: accessibility
- Servicio: business
- Servicio: auth.service
- Componente: storefront
- Configuración: package
- API: payments
- Pruebas: customer otp.auth.test
- Componente: customer login
- Pruebas: admin.routes.test
- Módulo: checkout url
- Servicio: api
- Componente: map modal
- Servicio: analytics
- Servicio: checkout
- Configuración: angular
- Configuración: angular
- Componente: reservation manager
- Componente: owner dashboard
- Módulo: migrate
- Módulo: currency
- Pruebas: payments.methods.test
- Configuración: angular
- Configuración: package
- Componente: account menu
- Configuración: package
- Módulo: generate secrets
- Módulo: errorHandler
- API: notifications
- Módulo: app.config
- Componente: admin payments
- Perfil del negocio
- Componente: business page
- Documentación: README
- API: analytics
- Configuración: docker compose
- Componente: app
- Servicio: api
- Componente: account create
- Servicio: business service card
- Componente: category filters
- Documentación: DEVELOPERS
- Vistas del panel administrativo
- Configuración: angular
- Configuración: angular
- Vista: app
- Modelo: catalog
- Servicio: seo
- Componente: admin businesses
- Componente: login
- Componente: badge
- Componente: business form
- Documentación: test story data
- Configuración: angular
- Configuración: angular
- Servicio: theme
- Componente: admin overview
- Componente: business login
- Configuración: ngsw config
- Documentación: mejoras futuras
- Configuración: package
- Servicio: businesses
- Documentación: README
- Componente: customer magic verify
- Componente: owner login
- Componente: owner register
- Pruebas: test
- Vista: index
- Módulo: tailwind.config
- Pruebas: security.config.test
- Pruebas: business.repository.test
- Pruebas: payments.hardening.test
- Documentación: DEPLOY
- Configuración: package
- Componente: payment cancel
- Componente: payment success
- Componente: skip link
- Módulo: environment.prod
- Configuración: pnpm workspace
- Documentación: SECURITY CHECKLIST
- Módulo: backup
- Módulo: backup offsite
- Módulo: restore
- Vista: map modal
- Módulo: robots
- Vista: storefront
- Módulo: dev
- Módulo: prod
- Documentación: GUIA ADMIN
- Vista: business profile
- Documentación: API
- Documentación: README
- Módulo: not found

## God Nodes (most connected - your core abstractions)
1. `ApiService` - 97 edges
2. `@angular/core` - 70 edges
3. `AuthService` - 67 edges
4. `BusinessAdminComponent` - 47 edges
5. `Business` - 46 edges
6. `AdminComponent` - 42 edges
7. `@angular/router` - 41 edges
8. `express` - 41 edges
9. `@angular/common` - 38 edges
10. `HomeComponent` - 37 edges

## Surprising Connections (you probably didn't know these)
- `Docker Compose de pruebas` --references--> `CI workflow`  [INFERRED]
  docker-compose.test.yml → .github/workflows/ci.yml
- `adminToken()` --calls--> `sign()`  [EXTRACTED]
  backend/test/admin.routes.test.js → backend/src/middleware/jwt.js
- `requireAnyAuth()` --calls--> `verify()`  [EXTRACTED]
  backend/src/routes/google.routes.js → backend/src/middleware/jwt.js
- `bulkCreateSlots()` --calls--> `clean()`  [EXTRACTED]
  backend/src/services/syncService.js → backend/src/middleware/sanitize.js
- `CI workflow` --references--> `Reservorio: guía y arquitectura`  [EXTRACTED]
  .github/workflows/ci.yml → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Services in the Reservorio Compose Stack** — docker_compose_yml_postgres_service, docker_compose_yml_backend_service, docker_compose_yml_frontend_service, docker_compose_yml_redis_service [EXTRACTED 1.00]

## Communities (150 total, 63 thin omitted)

### Community 0 - "Modelo: reservation"
Cohesion: 0.07
Nodes (43): Categoria, AdminFunnel, AdminReview, AdminServiceRecord, AdminStats, BookingPayload, BookingRecord, BookingRequest (+35 more)

### Community 1 - "Rutas y guards frontend"
Cohesion: 0.09
Nodes (21): adminGuard(), businessGuard(), customerGuard(), ownerGuard(), Theme, AccountType, AuthMode, NotFoundComponent (+13 more)

### Community 2 - "Servicio: offline"
Cohesion: 0.07
Nodes (21): authInterceptor(), decodePayload(), errorInterceptor(), getActiveToken(), getRedirectForExpiry(), hasAnyRawToken(), isLoginAttempt(), isTokenValid() (+13 more)

### Community 4 - "Pruebas: pagination.test"
Cohesion: 0.06
Nodes (38): bookingsService, createBooking(), listBookings(), createCustomer(), customersService, deleteCustomer(), exportCustomerData(), findCustomerByEmail() (+30 more)

### Community 5 - "Servicio: customer auth"
Cohesion: 0.09
Nodes (38): consoleEmail(), consoleSms(), digitsOnly(), EMAIL_PROVIDER, httpEmail(), httpPost(), httpSms(), logger (+30 more)

### Community 8 - "Módulo: index"
Cohesion: 0.05
Nodes (37): adminRoutes, allowedOrigins, analyticsRoutes, appMetrics, auth, bookingsRoutes, businesses, cache (+29 more)

### Community 9 - "Configuración: angular"
Cohesion: 0.06
Nodes (38): cli, packageManager, prefix, projectType, root, schematics, sourceRoot, newProjectRoot (+30 more)

### Community 10 - "Servicio: owner business"
Cohesion: 0.08
Nodes (15): Business, Owner, BusinessPage, OwnerBusinessService, filterBusinesses(), filterReservations(), getReservationStats(), BusinessCardComponent (+7 more)

### Community 11 - "API: businesses"
Cohesion: 0.08
Nodes (34): canAccessBusiness(), db, getBearerToken(), requireAdmin(), requireAdminOrOwner(), requireAuth(), requireBusinessAuth(), requireCustomer() (+26 more)

### Community 14 - "Servicio: auth"
Cohesion: 0.08
Nodes (28): jwt, logger, sign(), authenticateAdmin(), bcrypt, db, digitsOnly(), getAdminHash() (+20 more)

### Community 15 - "Pruebas: businesses.routes.test"
Cohesion: 0.06
Nodes (28): logger, { Pool }, app, app, bookingsRoutes, db, express, request (+20 more)

### Community 16 - "Módulo: cache"
Cohesion: 0.09
Nodes (28): client(), del(), delByPrefix(), get(), getRedisClient(), initRedis(), logger, memDel() (+20 more)

### Community 17 - "Módulo: gen icons"
Cohesion: 0.08
Nodes (21): argIndex, dir, __dirname, files, target, chunk(), crc32(), CRC_TABLE (+13 more)

### Community 18 - "Servicio: businesses"
Cohesion: 0.12
Nodes (28): attachLiveRatings(), authenticateBusiness(), bcrypt, businessListCacheKey(), businessRepository, cache, CACHE_TTL_SECONDS, { clean } (+20 more)

### Community 21 - "Configuración: tsconfig"
Cohesion: 0.07
Nodes (26): angularCompilerOptions, enableI18nLegacyMessageIdFormat, strictInjectionParameters, strictInputAccessModifiers, strictTemplates, compileOnSave, compilerOptions, declaration (+18 more)

### Community 22 - "Servicio: toast"
Cohesion: 0.11
Nodes (9): ENTER, EXIT, TO, PUBLIC_PAGES, ToastMessage, ToastService, ToastType, BulkSlotGeneratorComponent (+1 more)

### Community 25 - "Configuración: package"
Cohesion: 0.08
Nodes (24): allowScripts, bcrypt@6.0.0, author, description, engines, node, pnpm, keywords (+16 more)

### Community 26 - "API: categories"
Cohesion: 0.11
Nodes (20): handleValidation(), { validationResult }, { body }, db, express, { handleValidation }, router, { sign } (+12 more)

### Community 27 - "API: google"
Cohesion: 0.09
Nodes (21): db, express, gsheets, logger, oauthLimiter, rateLimit, requireAnyAuth(), router (+13 more)

### Community 28 - "API: auth"
Cohesion: 0.09
Nodes (21): authLimiter, authService, { body }, customerAuthService, express, { handleValidation }, logger, makeLimiter() (+13 more)

### Community 29 - "API: products"
Cohesion: 0.09
Nodes (19): { body, param }, businessIdValidator, { createHash, randomUUID }, createSignature(), db, express, { handleValidation }, productBodyValidators (+11 more)

### Community 30 - "Configuración: package"
Cohesion: 0.08
Nodes (23): name, packageManager, private, version, @angular/animations, @angular/build, @angular/cli, @angular/compiler (+15 more)

### Community 31 - "Módulo: business"
Cohesion: 0.12
Nodes (12): clean(), addService(), buildBusinessWhereClauses(), checkReservationSlotTaken(), { clean }, countBusinesses(), createBusiness(), createReservation() (+4 more)

### Community 33 - "API: services"
Cohesion: 0.10
Nodes (19): canAccessBusinessId(), { body, param, query }, { clean }, db, express, { handleValidation }, { requireAuth, canAccessBusinessId }, router (+11 more)

### Community 34 - "Servicio: googleSheets"
Cohesion: 0.18
Nodes (19): createOAuth2Client(), createTemplateSheet(), db, disconnect(), { encrypt, decrypt }, exchangeCode(), getAuthClient(), getAuthUrl() (+11 more)

### Community 35 - "Servicio: admin"
Cohesion: 0.15
Nodes (18): express, {
  getMarketplaceStats,
  listAllReviews,
  deleteReview,
  listAllServices,
  deleteService,
  listAdminPayments,
}, { requireAdmin }, router, { countViews }, db, deleteReview(), deleteService() (+10 more)

### Community 36 - "Pruebas: notifications.routes.test"
Cohesion: 0.11
Nodes (16): db, express, router, express, router, uxTips, app, db (+8 more)

### Community 37 - "Configuración: package"
Cohesion: 0.11
Nodes (18): dependencies, bcrypt, bcryptjs, compression, cors, dotenv, express, express-rate-limit (+10 more)

### Community 38 - "Servicio: payments"
Cohesion: 0.18
Nodes (15): allowedPaymentMethods, createCheckoutSession(), { createNotification }, createPayment(), db, { DEFAULT_CURRENCY, normalizeCurrency }, getCheckoutReturnUrls(), getPayment() (+7 more)

### Community 39 - "Pruebas: gdpr.test"
Cohesion: 0.12
Nodes (14): app, authRoutes, db, express, jwt, request, buildApp(), customersRoutes (+6 more)

### Community 40 - "Configuración: package"
Cohesion: 0.12
Nodes (17): dependencies, @angular/animations, @angular/common, @angular/compiler, @angular/core, @angular/forms, @angular/localize, @angular/platform-browser (+9 more)

### Community 41 - "Configuración: package"
Cohesion: 0.12
Nodes (17): devDependencies, @angular/build, @angular/cli, @angular/compiler-cli, autoprefixer, @axe-core/playwright, jsdom, @playwright/test (+9 more)

### Community 43 - "Configuración: turbo"
Cohesion: 0.12
Nodes (16): dependsOn, inputs, outputs, cache, inputs, cache, globalDependencies, $schema (+8 more)

### Community 44 - "API: reservations"
Cohesion: 0.15
Nodes (14): isValidPhone(), validateReservation(), validateUpdate(), { body, param, query }, db, express, { handleValidation }, { requireAuth, canAccessBusinessId } (+6 more)

### Community 45 - "Módulo: currency"
Cohesion: 0.24
Nodes (10): CURRENCY_LOCALES, CURRENCY_SYMBOLS, CurrencyCode, DEFAULT_CURRENCY, formatCurrency(), isValidCurrency(), normalizeCurrency(), SUPPORTED_CURRENCIES (+2 more)

### Community 46 - "Configuración: package"
Cohesion: 0.12
Nodes (15): devDependencies, turbo, engines, node, pnpm, name, packageManager, private (+7 more)

### Community 47 - "Servicio: reminders.worker"
Cohesion: 0.17
Nodes (10): setupGracefulShutdown(), startServer(), db, logger, notificationsService, runDueReminders(), startReminderWorker(), db (+2 more)

### Community 48 - "Servicio: customers"
Cohesion: 0.14
Nodes (8): db, fallbackCustomers, findOrCreateCustomer(), { listBookings }, { parsePagination }, { randomUUID }, db, { findOrCreateCustomer }

### Community 49 - "Servicio: realtime"
Cohesion: 0.21
Nodes (10): express, router, { sseHandler }, addClient(), broadcast(), broadcastBookingCreated(), broadcastBookingUpdated(), clients (+2 more)

### Community 50 - "Servicio: bookings"
Cohesion: 0.22
Nodes (11): { broadcastBookingCreated }, createBooking(), { createNotification }, db, listBookings(), logger, mapBooking(), { parsePagination } (+3 more)

### Community 51 - "Servicio: notifications"
Cohesion: 0.21
Nodes (12): createReservation(), channels, createNotification(), db, deliverExternalNotification(), listNotifications(), logger, mapNotification() (+4 more)

### Community 52 - "Pruebas: real business.routes.test"
Cohesion: 0.15
Nodes (10): app, bookingPayload, bookingsRoutes, customersRoutes, db, express, notificationsRoutes, paymentsRoutes (+2 more)

### Community 53 - "Módulo: accessibility"
Cohesion: 0.17
Nodes (5): playwrightPort, expectAccessible(), expectNoAxeViolations(), @axe-core/playwright, @playwright/test

### Community 55 - "Servicio: auth.service"
Cohesion: 0.27
Nodes (4): ApiResponse, OwnerBusinessFormValues, AccountOption, rxjs

### Community 57 - "Configuración: package"
Cohesion: 0.17
Nodes (12): global, branches, functions, lines, statements, jest, collectCoverage, coverageDirectory (+4 more)

### Community 58 - "API: payments"
Cohesion: 0.17
Nodes (11): allowedPaymentMethods, { body }, checkoutValidators, currencyValidator, express, { handleValidation }, {
  listPayments,
  createPayment,
  createCheckoutSession,
  processWebhook,
  getPayment,
  updatePaymentStatus,
}, paymentValidators (+3 more)

### Community 59 - "Pruebas: customer otp.auth.test"
Cohesion: 0.17
Nodes (10): app, authRoutes, channels, crypto, CUSTOMER, db, express, futureExpiry (+2 more)

### Community 61 - "Pruebas: admin.routes.test"
Cohesion: 0.20
Nodes (10): adminRoutes, adminToken(), bookingsService, buildApp(), customersService, db, express, paymentsService (+2 more)

### Community 62 - "Módulo: checkout url"
Cohesion: 0.29
Nodes (7): getAllowedCheckoutOrigins(), isAllowedCheckoutRedirect(), normalizeAllowedOrigin(), convertTwelveHour(), formatTime24(), padTwentyFourHour(), vitest

### Community 63 - "Servicio: api"
Cohesion: 0.18
Nodes (3): CatalogProduct, BusinessProductCardComponent, CartLine

### Community 64 - "Componente: map modal"
Cohesion: 0.25
Nodes (3): MapCoordinates, MapModalComponent, leaflet

### Community 65 - "Servicio: analytics"
Cohesion: 0.20
Nodes (7): countViews(), db, memoryEvents, { randomUUID }, adminService, analyticsService, db

### Community 66 - "Servicio: checkout"
Cohesion: 0.22
Nodes (8): bookingsService, businessesService, checkoutForBusiness(), customersService, bookingsService, businessesService, { checkoutForBusiness }, customersService

### Community 67 - "Configuración: angular"
Cohesion: 0.22
Nodes (10): extract-i18n, test, builder, options, architect, buildTarget, runner, tsConfig (+2 more)

### Community 68 - "Configuración: angular"
Cohesion: 0.20
Nodes (10): options, allowedCommonJsDependencies, assets, browser, index, outputPath, polyfills, scripts (+2 more)

### Community 71 - "Módulo: migrate"
Cohesion: 0.22
Nodes (5): { Client }, fs, MIGRATIONS_DIR, path, pg

### Community 72 - "Módulo: currency"
Cohesion: 0.31
Nodes (8): CURRENCY_LOCALES, CURRENCY_SYMBOLS, DEFAULT_CURRENCY, getLocaleForCurrency(), getSymbolForCurrency(), isValidCurrency(), normalizeCurrency(), SUPPORTED_CURRENCIES

### Community 73 - "Pruebas: payments.methods.test"
Cohesion: 0.25
Nodes (8): buildApp(), db, express, insertedPayment, notificationsService, paymentsRoutes, request, { sign }

### Community 74 - "Configuración: angular"
Cohesion: 0.22
Nodes (9): build, builder, configurations, defaultConfiguration, testing, aot, extractLicenses, optimization (+1 more)

### Community 75 - "Configuración: package"
Cohesion: 0.22
Nodes (9): scripts, build, e2e, format:check, format:fix, ng, start, test (+1 more)

### Community 77 - "Configuración: package"
Cohesion: 0.25
Nodes (8): scripts, db:migrate, db:migrate:create, dev, start, test, test:integration, test:watch

### Community 78 - "Módulo: generate secrets"
Cohesion: 0.25
Nodes (3): bcrypt, require, bcryptjs

### Community 79 - "Módulo: errorHandler"
Cohesion: 0.25
Nodes (6): logger, pino, errorHandler(), logger, notFound(), pino

### Community 80 - "API: notifications"
Cohesion: 0.25
Nodes (7): { body, query }, express, { handleValidation }, {
  listNotifications,
  createNotification,
  sendReminderNotification,
}, notificationValidators, { requireAuth }, router

### Community 81 - "Módulo: app.config"
Cohesion: 0.36
Nodes (5): appConfig, routes, featureRoutes, @angular/platform-browser, @angular/service-worker

### Community 86 - "Documentación: README"
Cohesion: 0.29
Nodes (7): init.sql Baseline Schema, Numbered SQL Migrations, schema_migrations, Reservorio Backend API, Express 5 REST API, Google Sheets Synchronization, PostgreSQL 16

### Community 87 - "API: analytics"
Cohesion: 0.29
Nodes (6): analyticsService, express, rateLimit, router, viewLimiter, express-rate-limit

### Community 88 - "Configuración: docker compose"
Cohesion: 0.52
Nodes (7): Backend Service, Database Backup Service, Reservorio Docker Compose Stack, Frontend Service, Optional Offsite Backup Service, PostgreSQL Database Service, Redis Service

### Community 89 - "Componente: app"
Cohesion: 0.33
Nodes (3): AppComponent, rand(), gsap

### Community 94 - "Documentación: DEVELOPERS"
Cohesion: 0.33
Nodes (6): Arquitectura Angular, Express y PostgreSQL, Docker Compose de pruebas, Guía de desarrollo y arquitectura, CI workflow, Sistema de reservas multi-negocio, Reservorio: guía y arquitectura

### Community 95 - "Vistas del panel administrativo"
Cohesion: 0.53
Nodes (6): Gestión administrativa de negocios, Vista de resumen administrativo, Gestión administrativa de pagos, Moderación administrativa de reseñas, Panel de administración: navegación y pestañas, Panel global: estadísticas, embudo de conversión, reseñas y pagos

### Community 96 - "Configuración: angular"
Cohesion: 0.33
Nodes (6): serve, proxyConfig, builder, configurations, defaultConfiguration, options

### Community 97 - "Configuración: angular"
Cohesion: 0.33
Nodes (6): production, budgets, buildTarget, fileReplacements, optimization, outputHashing

### Community 98 - "Vista: app"
Cohesion: 0.33
Nodes (6): Account Menu, Frontend Application Shell, Offline Status Banner, Router Outlet, Theme Toggle, Toast Notifications

### Community 105 - "Documentación: test story data"
Cohesion: 0.40
Nodes (5): El servidor externo debe permitir solicitudes CORS desde el dominio de la aplicación, Configuración de fuente JSON externa mediante window.__APP_CONFIG__.storyDataUrl, La escena ofrece reintento si la fuente no responde o el JSON no es válido, Historia 3D: contenido del libro cargado como JSON independiente de la escena, Esquema de historia: edition, location, intro, book y pages; entre una y seis páginas

### Community 106 - "Configuración: angular"
Cohesion: 0.40
Nodes (5): development, buildTarget, extractLicenses, optimization, sourceMap

### Community 107 - "Configuración: angular"
Cohesion: 0.40
Nodes (5): branches, functions, lines, statements, coverageThresholds

### Community 111 - "Configuración: ngsw config"
Cohesion: 0.40
Nodes (4): assetGroups, index, navigationUrls, $schema

### Community 112 - "Documentación: mejoras futuras"
Cohesion: 0.40
Nodes (5): Sincronización bidireccional con Google Calendar y Outlook, Cupones, descuentos y referidos, Búsqueda de negocios full-text y geográfica, Matriz de funcionalidades candidatas para P4, Lista de espera y reasignación automática de turnos

### Community 113 - "Configuración: package"
Cohesion: 0.50
Nodes (4): devDependencies, jest, nodemon, supertest

### Community 114 - "Servicio: businesses"
Cohesion: 0.50
Nodes (4): addService(), removeService(), updateReservation(), syncInBackground()

### Community 115 - "Documentación: README"
Cohesion: 0.50
Nodes (4): Generador masivo de slots: nombre, hora de inicio, duración y cantidad, Frontend Reservorio: aplicación Angular standalone con Tailwind CSS, GSAP y Leaflet, Estado global reactivo implementado con Angular Signals, Tokens JWT separados por rol y almacenados en sessionStorage o localStorage

### Community 119 - "Pruebas: test"
Cohesion: 0.50
Nodes (4): Recorrido animado por una historia de barrio, Índice de páginas y capítulos de la historia, Datos de la historia en /assets/data/test-story.json, Controles de reproducción, salto y reinicio

### Community 120 - "Vista: index"
Cohesion: 0.50
Nodes (4): Fuentes Manrope e Inter, Reservorio, sitio para encontrar negocios locales y reservar citas, Inicialización del tema oscuro desde localStorage o preferencia del sistema, SearchAction con búsqueda mediante el parámetro q

### Community 125 - "Documentación: DEPLOY"
Cohesion: 0.67
Nodes (3): Docker Compose de producción, Backup y restauración PostgreSQL, Despliegue en producción

### Community 126 - "Configuración: package"
Cohesion: 0.67
Nodes (3): engines, node, pnpm

### Community 131 - "Configuración: pnpm workspace"
Cohesion: 0.67
Nodes (3): Paquete backend del workspace pnpm, Paquete frontend del workspace pnpm, Workspace pnpm del monorepo Reservorio

## Knowledge Gaps
- **68 isolated node(s):** `dotenv`, `google-auth-library`, `jest`, `nodemon`, `@angular/animations` (+63 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1122 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **63 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@angular/core` connect `Rutas y guards frontend` to `Modelo: reservation`, `Componente: map modal`, `Servicio: offline`, `Componente: skip link`, `Servicio: owner business`, `Módulo: currency`, `Módulo: app.config`, `Servicio: toast`, `Servicio: auth.service`, `Servicio: business service card`, `Configuración: package`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `dotenv`, `google-auth-library`, `jest` to the rest of the system?**
  _68 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Modelo: reservation` be split into smaller, more focused modules?**
  _Cohesion score 0.07291666666666667 - nodes in this community are weakly interconnected._
- **Why does `ApiService` connect `Servicio: api` to `Modelo: reservation`, `Rutas y guards frontend`, `Servicio: offline`, `Modelo: catalog`, `Servicio: owner business`, `Módulo: currency`, `Servicio: api`, `Servicio: business`, `Servicio: auth.service`, `Servicio: toast`, `Servicio: api`, `Servicio: business service card`, `Servicio: api`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Should `Rutas y guards frontend` be split into smaller, more focused modules?**
  _Cohesion score 0.09013914095583787 - nodes in this community are weakly interconnected._
- **Why does `express` connect `Pruebas: notifications.routes.test` to `Pruebas: pagination.test`, `Módulo: index`, `API: businesses`, `Servicio: auth`, `Pruebas: businesses.routes.test`, `Módulo: cache`, `Configuración: package`, `API: categories`, `API: google`, `API: auth`, `API: products`, `API: services`, `Servicio: admin`, `Pruebas: gdpr.test`, `API: reservations`, `Servicio: realtime`, `Pruebas: real business.routes.test`, `API: payments`, `Pruebas: customer otp.auth.test`, `Pruebas: admin.routes.test`, `Pruebas: payments.methods.test`, `API: notifications`, `API: analytics`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Should `Servicio: offline` be split into smaller, more focused modules?**
  _Cohesion score 0.06775510204081632 - nodes in this community are weakly interconnected._