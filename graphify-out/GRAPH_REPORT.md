# Graph Report - Reservorio  (2026-10-26)

## Corpus Check
- Large corpus: 340 files · ~1,555,674 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 2269 nodes · 4080 edges · 200 communities (88 shown, 112 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 193 edges (avg confidence: 0.85)
- Token cost: 5,300 input · 4,350 output

## Community Hubs (Navigation)
- Api Service
- Business Page Component Ts
- Supabase Auth Service
- Admin Component
- Google Routes Js
- Angular Core
- Index Js
- Businesses Routes Js
- Business Admin Component
- Sign Module
- Customer Auth Service Js
- Auth Service
- Gen Icons Mjs
- Schematics Module
- Home Component
- App Component Ts
- Reservations Routes Js
- Express Module
- Business Admin Component Ts
- Api Service Ts
- Booking Component
- Package Json
- Admin Component Ts
- Compiler Options
- Business Repository Js
- Business Module
- Validation Js
- Businesses Service Js
- Frontend Package Json
- Business Admin Service
- Test Component
- Auth Routes Js
- Products Routes Js
- Http Interceptor Ts
- Auth Service Ts
- Admin Service
- Backend Package Json
- Ratings Routes Js
- Admin Service Js
- Payments Service Js
- Notifications Service Js
- Payments Routes Test Js
- Dev Dependencies
- Routes Ts
- Dependencies Module
- Cache Js
- Dependencies Module
- Test Module
- Customers History Test Js
- Real Business Routes Test Js
- Customer History Component
- Payment Module
- Checkout Service Js
- Customers Routes Js
- Db Js
- Customers Service Js
- Reservation Module
- Category Filters Component
- Seo Service
- Realtime Service Js
- Bookings Service Js
- Playwright Test
- Customer Login Component
- Stats Bar Component
- Jest Module
- Payments Routes Js
- Reminders Worker Test Js
- Customer Otp Auth Test Js
- Idempotency Cleanup Worker Js
- Ref Crypto
- Admin Routes Test Js
- Pagination Test Js
- Scripts Module
- Home Component Ts
- Login Component
- Bookings Routes Js
- Payments Methods Test Js
- Options Module
- Options Module
- Owner Dashboard Component
- Migrate Js
- Currency Js
- Analytics Service Js
- Gdpr Test Js
- Testing Module
- Account Menu Component Ts
- Account Menu Component
- Scripts Module
- Generate Secrets Mjs
- Logger Js
- Business Profile Component
- Owner Login Component
- Analytics Routes Js
- Review Module
- Account Create Component
- Slider Component
- Bookings Routes Test Js
- Serve Module
- Production Module
- Badge Component
- Business Form Component
- Historia 3 D Contenido Del
- Development Module
- Coverage Thresholds
- Admin Console
- Business Login Component
- Reservorio Website Seo And Social
- Ngsw Config Json
- Supabase Postgres Best Practices
- Dev Dependencies
- Customer Magic Verify Component
- Owner Register Component
- Tailwind Config Js
- Postgre Sql Index Types
- Engines Module
- Auth Callback Component
- Payment Cancel Component
- Payment Success Component
- Skip Link Component Ts
- Environment Prod Ts
- Skill Feedback Process
- Row Level Security
- Backup Sh Script
- Backup Offsite Sh Script
- Restore Sh Script
- List Reservations
- Postgre Sql Restore Drill
- Rationale To Divide The Administration
- Local Business Storefront
- Presentations Page
- Theme Bootstrap And Runtime Api
- Dev Sh Script
- Gu A Para Administradores De
- Supabase Skill Changelog
- Supabase Postgres Best Practices Changelog
- Table Partitioning
- Postgres Best Practice Reference Template
- Supabase Agent Skill
- Web Interface Guidelines
- Customer Consent Columns Rollback
- Numbered Sql Migrations
- Reservorio Rest Api
- Production Deployment
- Contratos De La Api
- Reservorio Developer Guide
- Business Qr Test Data
- Supabase Authentication
- Professionalization Todo
- Generador Masivo De Slots Nombre
- Pull Request Template Guidance
- Reservorio Frontend Application
- Application Shell
- Storefront Product Catalog And Cart
- Whats App Storefront Orders
- Leaflet Map Location Picker
- Ilustraci N De P Gina
- Juno Logo With Orange Power
- Spanish Promotional Slide Encouraging Businesses
- Directorio Empresarial Que Re Ne
- Spanish Presentation Slide Titled Publicidad
- Spanish Presentation Slide Titled Credibilidad
- Diapositiva Titulada Resultados Medibles Destaca
- Diapositiva En Espa Ol Titulada
- Presentaci N En Espa Ol
- Spanish Presentation Slide Explaining Improved
- Spanish Promotional Slide Titled Directorio
- Ci Pipeline
- Angular Frontend
- Node Js And Express Backend
- Postgre Sql
- Reservorio Multi Business Booking System
- Production Security Checklist

## God Nodes (most connected - your core abstractions)
1. `ApiService` - 98 edges
2. `@angular/core` - 85 edges
3. `ApiResponse` - 85 edges
4. `AuthService` - 77 edges
5. `Business` - 54 edges
6. `BusinessAdminComponent` - 48 edges
7. `AdminComponent` - 43 edges
8. `@angular/common` - 42 edges
9. `@angular/router` - 42 edges
10. `express` - 41 edges

## Surprising Connections (you probably didn't know these)
- `Business administration PIN form` --conceptually_related_to--> `Rationale to divide the administration panel gradually`  [INFERRED]
  frontend/src/app/features/business-admin/business-profile.component.html → graphify-out/memory/query_20261015_140658_45236d45_conviene_dividir_el_panel_de_administración.md
- `adminToken()` --calls--> `sign()`  [EXTRACTED]
  backend/test/admin.routes.test.js → backend/src/middleware/jwt.js
- `requireAnyAuth()` --calls--> `verify()`  [EXTRACTED]
  backend/src/routes/google.routes.js → backend/src/middleware/jwt.js
- `bulkCreateSlots()` --calls--> `clean()`  [EXTRACTED]
  backend/src/services/syncService.js → backend/src/middleware/sanitize.js
- `Indexes for WHERE and JOIN columns` --semantically_similar_to--> `Foreign key indexes`  [INFERRED] [semantically similar]
  .agents/skills/supabase-postgres-best-practices/references/query-missing-indexes.md → .agents/skills/supabase-postgres-best-practices/references/schema-foreign-key-indexes.md

## Import Cycles
- None detected.

## Communities (200 total, 112 thin omitted)

### Community 0 - "Api Service"
Cohesion: 0.06
Nodes (4): ApiResponse, BookingPayload, Customer, ApiService

### Community 1 - "Business Page Component Ts"
Cohesion: 0.06
Nodes (19): CURRENCY_LOCALES, CURRENCY_SYMBOLS, CurrencyCode, DEFAULT_CURRENCY, formatCurrency(), isValidCurrency(), normalizeCurrency(), SUPPORTED_CURRENCIES (+11 more)

### Community 2 - "Supabase Auth Service"
Cohesion: 0.06
Nodes (17): AppComponent, rand(), isBrowser(), OfflineService, SupabaseAuthService, isRecord(), parseStoryData(), requiredText() (+9 more)

### Community 3 - "Admin Component"
Cohesion: 0.06
Nodes (4): AdminComponent, MapCoordinates, MapModalComponent, leaflet

### Community 4 - "Google Routes Js"
Cohesion: 0.07
Nodes (40): db, express, gsheets, logger, oauthLimiter, rateLimit, requireAnyAuth(), router (+32 more)

### Community 5 - "Angular Core"
Cohesion: 0.10
Nodes (13): AccountType, AuthMode, LoadingComponent, NotFoundComponent, PresentacionesComponent, PrivacyPolicyComponent, AuthCardComponent, BadgeVariant (+5 more)

### Community 6 - "Index Js"
Cohesion: 0.05
Nodes (41): adminRoutes, allowedOrigins, analyticsRoutes, appMetrics, auth, bookingsRoutes, businesses, businessesService (+33 more)

### Community 7 - "Businesses Routes Js"
Cohesion: 0.07
Nodes (40): runWithRlsContext(), canAccessBusiness(), db, getBearerToken(), requireAdmin(), requireAdminOrOwner(), requireAuth(), requireBusinessAuth() (+32 more)

### Community 9 - "Sign Module"
Cohesion: 0.07
Nodes (34): jwt, logger, sign(), verify(), authenticateAdmin(), bcrypt, db, digitsOnly() (+26 more)

### Community 10 - "Customer Auth Service Js"
Cohesion: 0.09
Nodes (38): consoleEmail(), consoleSms(), digitsOnly(), EMAIL_PROVIDER, httpEmail(), httpPost(), httpSms(), logger (+30 more)

### Community 12 - "Gen Icons Mjs"
Cohesion: 0.06
Nodes (28): argIndex, dir, __dirname, files, target, backupScript, fs, gitBash (+20 more)

### Community 13 - "Schematics Module"
Cohesion: 0.06
Nodes (38): cli, packageManager, prefix, projectType, root, schematics, sourceRoot, newProjectRoot (+30 more)

### Community 15 - "App Component Ts"
Cohesion: 0.08
Nodes (12): ENTER, EXIT, TO, PUBLIC_PAGES, Theme, ThemeService, ToastMessage, ToastService (+4 more)

### Community 16 - "Reservations Routes Js"
Cohesion: 0.06
Nodes (30): canAccessBusinessId(), { body, param, query }, db, express, { handleValidation }, { requireAuth, canAccessBusinessId }, reservationCreateValidators, reservationListValidators (+22 more)

### Community 17 - "Express Module"
Cohesion: 0.07
Nodes (26): app, db, express, router, express, router, uxTips, app (+18 more)

### Community 18 - "Business Admin Component Ts"
Cohesion: 0.11
Nodes (15): getAllowedCheckoutOrigins(), isAllowedCheckoutRedirect(), normalizeAllowedOrigin(), clearIdempotencyAttempt(), idempotencyAttempt, convertTwelveHour(), formatTime24(), padTwentyFourHour() (+7 more)

### Community 19 - "Api Service Ts"
Cohesion: 0.09
Nodes (18): AdminFunnel, BookingRecord, BookingRequest, CheckoutInstructions, CheckoutSession, CustomerExport, CustomerExportBooking, CustomerExportNotification (+10 more)

### Community 21 - "Package Json"
Cohesion: 0.07
Nodes (29): devDependencies, eslint, eslint-config-prettier, husky, prettier, turbo, @typescript-eslint/eslint-plugin, @typescript-eslint/parser (+21 more)

### Community 22 - "Admin Component Ts"
Cohesion: 0.10
Nodes (9): AdminReview, AdminStats, AdminBusinessesComponent, AdminTab, AdminOverviewComponent, AdminReviewsComponent, filterBusinesses(), filterReservations() (+1 more)

### Community 23 - "Compiler Options"
Cohesion: 0.07
Nodes (27): angularCompilerOptions, enableI18nLegacyMessageIdFormat, strictInjectionParameters, strictInputAccessModifiers, strictTemplates, compileOnSave, compilerOptions, declaration (+19 more)

### Community 24 - "Business Repository Js"
Cohesion: 0.11
Nodes (15): clean(), isValidPhone(), validateReservation(), validateUpdate(), addService(), buildBusinessWhereClauses(), checkReservationSlotTaken(), { clean } (+7 more)

### Community 25 - "Business Module"
Cohesion: 0.09
Nodes (6): Business, NewBusinessPayload, Owner, BusinessPage, BusinessService, OwnerBusinessService

### Community 26 - "Validation Js"
Cohesion: 0.11
Nodes (20): handleValidation(), { validationResult }, { body }, db, express, { handleValidation }, router, { sign } (+12 more)

### Community 27 - "Businesses Service Js"
Cohesion: 0.14
Nodes (24): attachLiveRatings(), authenticateBusiness(), bcrypt, businessRepository, cache, CACHE_TTL_SECONDS, { clean }, createBusiness() (+16 more)

### Community 28 - "Frontend Package Json"
Cohesion: 0.08
Nodes (24): prettier, name, packageManager, private, version, @angular/build, @angular/cli, @angular/compiler (+16 more)

### Community 29 - "Business Admin Service"
Cohesion: 0.09
Nodes (3): CloudinaryUploadedImage, CloudinaryUploadSignature, BusinessAdminService

### Community 31 - "Auth Routes Js"
Cohesion: 0.09
Nodes (21): authLimiter, authService, { body }, customerAuthService, express, { handleValidation }, logger, makeLimiter() (+13 more)

### Community 32 - "Products Routes Js"
Cohesion: 0.09
Nodes (19): { body, param }, businessIdValidator, { createHash, randomUUID }, createSignature(), db, express, { handleValidation }, productBodyValidators (+11 more)

### Community 33 - "Http Interceptor Ts"
Cohesion: 0.14
Nodes (13): appConfig, routes, authInterceptor(), decodePayload(), errorInterceptor(), getActiveToken(), getRedirectForExpiry(), hasAnyRawToken() (+5 more)

### Community 34 - "Auth Service Ts"
Cohesion: 0.15
Nodes (6): OwnerAuthPayload, BusinessAdminProfileValues, OwnerBusinessFormValues, BusinessListComponent, SidebarComponent, rxjs

### Community 35 - "Admin Service"
Cohesion: 0.10
Nodes (4): Categoria, AdminServiceRecord, UpdatePayload, AdminService

### Community 36 - "Backend Package Json"
Cohesion: 0.09
Nodes (21): author, description, engines, node, pnpm, keywords, license, main (+13 more)

### Community 37 - "Ratings Routes Js"
Cohesion: 0.10
Nodes (19): { body }, express, { handleValidation }, { listReviews, getAverageRating, createReview }, rateLimit, ratingsLimiter, router, cache (+11 more)

### Community 38 - "Admin Service Js"
Cohesion: 0.15
Nodes (19): express, {
  getMarketplaceStats,
  listAllReviews,
  deleteReview,
  listAllServices,
  deleteService,
  listAdminPayments,
}, { requireAdmin }, router, { countViews }, db, deleteReview(), deleteService() (+11 more)

### Community 39 - "Payments Service Js"
Cohesion: 0.15
Nodes (19): deliverExternalNotification(), allowedPaymentMethods, createCheckoutSession(), { createHash, randomUUID }, createPayment(), db, { DEFAULT_CURRENCY, normalizeCurrency }, { deliverExternalNotification } (+11 more)

### Community 40 - "Notifications Service Js"
Cohesion: 0.13
Nodes (18): { body, query }, express, { handleValidation }, {
  listNotifications,
  createNotification,
  sendReminderNotification,
}, notificationValidators, { requireAuth }, router, createReservation() (+10 more)

### Community 41 - "Payments Routes Test Js"
Cohesion: 0.12
Nodes (14): createIdempotencyDb(), { createIdempotencyDb }, { db, state }, payments, { createIdempotencyDb }, { db, state }, payments, app (+6 more)

### Community 42 - "Dev Dependencies"
Cohesion: 0.11
Nodes (19): devDependencies, @angular/build, @angular/cli, @angular/compiler-cli, autoprefixer, @axe-core/playwright, jsdom, lint-staged (+11 more)

### Community 43 - "Routes Ts"
Cohesion: 0.19
Nodes (9): adminGuard(), businessGuard(), customerGuard(), ownerGuard(), adminRoutes, businessRoutes, customerRoutes, ownerRoutes (+1 more)

### Community 44 - "Dependencies Module"
Cohesion: 0.11
Nodes (18): dependencies, bcrypt, bcryptjs, compression, cors, dotenv, express, express-rate-limit (+10 more)

### Community 45 - "Cache Js"
Cohesion: 0.18
Nodes (15): client(), del(), delByPrefix(), get(), getRedisClient(), initRedis(), logger, memDel() (+7 more)

### Community 46 - "Dependencies Module"
Cohesion: 0.11
Nodes (18): dependencies, @angular/common, @angular/compiler, @angular/core, @angular/forms, @angular/localize, @angular/platform-browser, @angular/router (+10 more)

### Community 47 - "Test Module"
Cohesion: 0.11
Nodes (17): dependsOn, inputs, outputs, cache, inputs, cache, globalDependencies, $schema (+9 more)

### Community 48 - "Customers History Test Js"
Cohesion: 0.12
Nodes (14): app, authRoutes, db, express, jwt, request, bookingsService, buildApp() (+6 more)

### Community 49 - "Real Business Routes Test Js"
Cohesion: 0.13
Nodes (12): getTestDatabaseUrl(), app, bookingPayload, bookingsRoutes, customersRoutes, db, express, notificationsRoutes (+4 more)

### Community 51 - "Payment Module"
Cohesion: 0.17
Nodes (3): Payment, PaymentStatus, AdminPaymentsComponent

### Community 52 - "Checkout Service Js"
Cohesion: 0.14
Nodes (14): addService(), removeService(), { broadcastBookingCreated }, checkoutForBusiness(), { clean }, db, { deliverExternalNotification }, idempotency (+6 more)

### Community 53 - "Customers Routes Js"
Cohesion: 0.20
Nodes (13): createCustomer(), customersService, deleteCustomer(), exportCustomerData(), findCustomerByEmail(), getCustomerHistory(), getCustomerProfile(), listCustomers() (+5 more)

### Community 54 - "Db Js"
Cohesion: 0.18
Nodes (11): applyRlsContext(), connect(), { AsyncLocalStorage }, getRlsContext(), storage, { getRlsContext }, logger, { Pool } (+3 more)

### Community 55 - "Customers Service Js"
Cohesion: 0.14
Nodes (8): db, fallbackCustomers, findOrCreateCustomer(), { listBookings }, { parsePagination }, { randomUUID }, db, { findOrCreateCustomer }

### Community 56 - "Reservation Module"
Cohesion: 0.15
Nodes (6): Reservation, calculateBusinessAnalytics(), countBy(), GroupItem, groupReservationActivity(), summarizeReservations()

### Community 59 - "Realtime Service Js"
Cohesion: 0.21
Nodes (10): express, router, { sseHandler }, addClient(), broadcast(), broadcastBookingCreated(), broadcastBookingUpdated(), clients (+2 more)

### Community 60 - "Bookings Service Js"
Cohesion: 0.22
Nodes (11): { broadcastBookingCreated }, createBooking(), { createNotification }, db, listBookings(), logger, mapBooking(), { parsePagination } (+3 more)

### Community 61 - "Playwright Test"
Cohesion: 0.17
Nodes (5): playwrightPort, expectAccessible(), expectNoAxeViolations(), @axe-core/playwright, @playwright/test

### Community 64 - "Jest Module"
Cohesion: 0.17
Nodes (12): global, branches, functions, lines, statements, jest, collectCoverage, coverageDirectory (+4 more)

### Community 65 - "Payments Routes Js"
Cohesion: 0.17
Nodes (11): allowedPaymentMethods, { body }, checkoutValidators, currencyValidator, express, { handleValidation }, {
  listPayments,
  createPayment,
  createCheckoutSession,
  processWebhook,
  getPayment,
  updatePaymentStatus,
}, paymentValidators (+3 more)

### Community 66 - "Reminders Worker Test Js"
Cohesion: 0.21
Nodes (8): db, logger, notificationsService, runDueReminders(), startReminderWorker(), db, notificationsService, { runDueReminders, startReminderWorker }

### Community 67 - "Customer Otp Auth Test Js"
Cohesion: 0.17
Nodes (10): app, authRoutes, channels, crypto, CUSTOMER, db, express, futureExpiry (+2 more)

### Community 68 - "Idempotency Cleanup Worker Js"
Cohesion: 0.24
Nodes (8): setupGracefulShutdown(), startServer(), cleanupExpiredIdempotencyRecords(), db, logger, startIdempotencyCleanupWorker(), { cleanupExpiredIdempotencyRecords }, mockQuery

### Community 69 - "Ref Crypto"
Cohesion: 0.24
Nodes (8): businessListCacheKey(), stableStringify(), canonicalize(), claim(), { createHash, randomUUID }, db, release(), requestHash()

### Community 70 - "Admin Routes Test Js"
Cohesion: 0.20
Nodes (10): adminRoutes, adminToken(), bookingsService, buildApp(), customersService, db, express, paymentsService (+2 more)

### Community 71 - "Pagination Test Js"
Cohesion: 0.20
Nodes (10): app, bookingsRoutes, buildApp(), customersRoutes, db, express, { parsePagination }, paymentsRoutes (+2 more)

### Community 72 - "Scripts Module"
Cohesion: 0.18
Nodes (11): scripts, build, coverage, e2e, format:check, format:fix, lint, ng (+3 more)

### Community 73 - "Home Component Ts"
Cohesion: 0.22
Nodes (6): BusinessCardComponent, EMPTY_FILTERS, HomeFilters, DEFAULT_CATEGORIES, FALLBACK_BUSINESSES, StatsBarItem

### Community 75 - "Bookings Routes Js"
Cohesion: 0.24
Nodes (8): bookingsService, createBooking(), listBookings(), { bookingValidators }, express, { listBookings, createBooking }, router, bookingValidators

### Community 76 - "Payments Methods Test Js"
Cohesion: 0.22
Nodes (9): buildApp(), { createIdempotencyDb }, { db, state }, express, insertedPayment, notificationsService, paymentsRoutes, request (+1 more)

### Community 77 - "Options Module"
Cohesion: 0.22
Nodes (10): extract-i18n, test, builder, options, architect, buildTarget, runner, tsConfig (+2 more)

### Community 78 - "Options Module"
Cohesion: 0.20
Nodes (10): options, allowedCommonJsDependencies, assets, browser, index, outputPath, polyfills, scripts (+2 more)

### Community 80 - "Migrate Js"
Cohesion: 0.22
Nodes (5): { Client }, fs, MIGRATIONS_DIR, path, pg

### Community 81 - "Currency Js"
Cohesion: 0.31
Nodes (8): CURRENCY_LOCALES, CURRENCY_SYMBOLS, DEFAULT_CURRENCY, getLocaleForCurrency(), getSymbolForCurrency(), isValidCurrency(), normalizeCurrency(), SUPPORTED_CURRENCIES

### Community 82 - "Analytics Service Js"
Cohesion: 0.22
Nodes (6): db, memoryEvents, { randomUUID }, adminService, analyticsService, db

### Community 83 - "Gdpr Test Js"
Cohesion: 0.25
Nodes (7): buildApp(), customersRoutes, customersService, db, express, jwt, request

### Community 84 - "Testing Module"
Cohesion: 0.22
Nodes (9): build, builder, configurations, defaultConfiguration, testing, aot, extractLicenses, optimization (+1 more)

### Community 87 - "Scripts Module"
Cohesion: 0.25
Nodes (8): scripts, db:migrate, db:migrate:create, dev, start, test, test:integration, test:watch

### Community 88 - "Generate Secrets Mjs"
Cohesion: 0.25
Nodes (3): bcrypt, require, bcryptjs

### Community 89 - "Logger Js"
Cohesion: 0.25
Nodes (6): logger, pino, errorHandler(), logger, notFound(), pino

### Community 93 - "Analytics Routes Js"
Cohesion: 0.29
Nodes (6): analyticsService, express, rateLimit, router, viewLimiter, express-rate-limit

### Community 97 - "Bookings Routes Test Js"
Cohesion: 0.33
Nodes (5): app, bookingsRoutes, db, express, request

### Community 98 - "Serve Module"
Cohesion: 0.33
Nodes (6): serve, proxyConfig, builder, configurations, defaultConfiguration, options

### Community 99 - "Production Module"
Cohesion: 0.33
Nodes (6): production, budgets, buildTarget, fileReplacements, optimization, outputHashing

### Community 102 - "Historia 3 D Contenido Del"
Cohesion: 0.40
Nodes (5): El servidor externo debe permitir solicitudes CORS desde el dominio de la aplicación, Configuración de fuente JSON externa mediante window.__APP_CONFIG__.storyDataUrl, La escena ofrece reintento si la fuente no responde o el JSON no es válido, Historia 3D: contenido del libro cargado como JSON independiente de la escena, Esquema de historia: edition, location, intro, book y pages; entre una y seis páginas

### Community 103 - "Development Module"
Cohesion: 0.40
Nodes (5): development, buildTarget, extractLicenses, optimization, sourceMap

### Community 104 - "Coverage Thresholds"
Cohesion: 0.40
Nodes (5): branches, functions, lines, statements, coverageThresholds

### Community 105 - "Admin Console"
Cohesion: 0.40
Nodes (5): Admin Businesses Panel, Admin Console, Admin Overview, Admin Payments Panel, Admin Reviews Panel

### Community 107 - "Reservorio Website Seo And Social"
Cohesion: 0.40
Nodes (5): Reservorio website SEO and social metadata, Reservorio WebSite and SearchAction structured data, Search crawler access policy, Product and scalability improvement roadmap, pnpm workspace configuration

### Community 108 - "Ngsw Config Json"
Cohesion: 0.40
Nodes (4): assetGroups, index, navigationUrls, $schema

### Community 110 - "Dev Dependencies"
Cohesion: 0.50
Nodes (4): devDependencies, jest, nodemon, supertest

### Community 115 - "Engines Module"
Cohesion: 0.67
Nodes (3): engines, node, pnpm

## Knowledge Gaps
- **93 isolated node(s):** `dotenv`, `google-auth-library`, `jest`, `nodemon`, `@angular/compiler` (+88 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1187 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **112 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@angular/core` connect `Angular Core` to `Http Interceptor Ts`, `Supabase Auth Service`, `Admin Service`, `Auth Service Ts`, `Business Page Component Ts`, `Admin Component`, `Home Component Ts`, `Routes Ts`, `App Component Ts`, `Business Admin Component Ts`, `Api Service Ts`, `Payment Module`, `Account Menu Component Ts`, `Admin Component Ts`, `Skip Link Component Ts`, `Frontend Package Json`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **What connects `dotenv`, `google-auth-library`, `jest` to the rest of the system?**
  _93 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Api Service` be split into smaller, more focused modules?**
  _Cohesion score 0.06095481670929241 - nodes in this community are weakly interconnected._
- **Why does `express` connect `Express Module` to `Google Routes Js`, `Index Js`, `Businesses Routes Js`, `Sign Module`, `Reservations Routes Js`, `Validation Js`, `Auth Routes Js`, `Products Routes Js`, `Backend Package Json`, `Ratings Routes Js`, `Admin Service Js`, `Notifications Service Js`, `Payments Routes Test Js`, `Customers History Test Js`, `Real Business Routes Test Js`, `Customers Routes Js`, `Realtime Service Js`, `Payments Routes Js`, `Customer Otp Auth Test Js`, `Admin Routes Test Js`, `Pagination Test Js`, `Bookings Routes Js`, `Payments Methods Test Js`, `Gdpr Test Js`, `Analytics Routes Js`, `Bookings Routes Test Js`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Should `Business Page Component Ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05536723163841808 - nodes in this community are weakly interconnected._
- **Why does `@angular/router` connect `Angular Core` to `Http Interceptor Ts`, `Auth Service Ts`, `Business Page Component Ts`, `Supabase Auth Service`, `Home Component Ts`, `Routes Ts`, `App Component Ts`, `Business Admin Component Ts`, `Account Menu Component Ts`, `Admin Component Ts`, `Frontend Package Json`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Should `Supabase Auth Service` be split into smaller, more focused modules?**
  _Cohesion score 0.05779220779220779 - nodes in this community are weakly interconnected._