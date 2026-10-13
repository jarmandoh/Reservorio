# Graph Report - Reservorio  (2026-10-12)

## Corpus Check
- 237 files · ~146,244 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 26 file(s) not represented in the graph (top: (none) 15, .css 5, .example 2)

## Summary
- 1963 nodes · 3545 edges · 131 communities (81 shown, 50 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 176 edges (avg confidence: 0.85)
- Token cost: unavailable (delegated agent usage was not returned by the tool)

## Community Hubs (Navigation)
- Rutas y guards del frontend
- Modelos y perfil de negocio
- Panel de administración
- Cliente API del frontend
- Panel de negocio propietario
- Inicio y manejo de errores backend
- Reservas y checkout frontend
- Pagos y moneda backend
- Validación y repositorios
- Configuración Angular
- Autorización backend
- Modelos y servicios API
- Autenticación frontend
- Clientes y privacidad
- Autenticación backend
- Exploración de negocios
- Pruebas de rutas backend
- Catálogo de productos y servicios
- Generación de iconos y utilidades
- Validación y categorías API
- Analítica y reseñas administrativas
- Servicios de negocios backend
- Configuración TypeScript Angular
- Acceso de clientes
- Interfaz y generación de horarios
- Experiencia de historia interactiva
- Configuración del backend
- Rutas y límites de autenticación
- API del catálogo de productos
- Configuración del frontend
- Servicios de administración de negocio
- Servicios administrativos
- Intercepciones HTTP y almacenamiento
- Modelos de reserva y administración
- Rutas de servicios
- Integraciones Google Sheets
- API de reservas y pruebas
- Dependencias del backend
- Caché backend
- Datos de historias interactivas
- Documentación de despliegue
- Pruebas de privacidad y acceso
- Dependencias Angular
- Herramientas de compilación frontend
- Historial de reservas del cliente
- Tareas del monorepo
- Calificaciones y reseñas API
- Notificaciones y reservas
- Canales de email y SMS
- Pagos y checkout frontend
- Configuración del workspace
- Recordatorios de reservas
- Reservas y disponibilidad
- Gestión de clientes backend
- Integración API Google Sheets
- Etiquetas y experiencia de usuario
- Eventos de reservas en tiempo real
- Pruebas end-to-end de negocio
- Pruebas de accesibilidad web
- Cobertura de código
- Pruebas de verificación OTP
- Soporte sin conexión
- Interfaz de acceso de clientes
- Sincronización de horarios
- Pruebas de administración
- Orquestación del checkout
- Pruebas e internacionalización
- Activos y compilación Angular
- App shell y tema visual
- Modal de gestión de reservas
- Panel del propietario
- Tienda y carrito
- Migraciones de base de datos
- Pruebas de pagos
- Objetivos de compilación Angular
- Comandos del frontend
- Flujos de datos de reservas
- SEO y navegación
- Lista de negocios y navegación
- Comandos del backend
- Generación de secretos
- Rutas de analítica
- Creación de cuentas
- Filtros de categorías
- Servidor de desarrollo Angular
- Compilación de producción
- Página de negocio
- Inicio de sesión de clientes
- Retorno de pagos y accesibilidad
- Formulario de negocio
- Contenido de historia externa
- Configuración de desarrollo
- Umbrales de cobertura
- Preferencia de tema
- Acceso de negocios
- Caché de aplicación web
- Hoja de ruta de producto
- Pruebas backend
- Registro y diagnóstico backend
- Horarios y documentación frontend
- Verificación de acceso por código
- Acceso de propietarios
- Registro de propietarios
- Interfaz de historia interactiva
- Metadatos, fuentes y tema
- Sistema de estilos Tailwind
- Pruebas de configuración segura
- Versiones del monorepo
- Confirmación de pago
- Configuración de producción
- Paquetes del workspace
- Backup local de base de datos
- Backup externo de base de datos
- Restauración de base de datos
- Documentación de panel administrativo
- Selector de ubicación en mapa
- Indexación y sitemap
- Tienda pública
- Inicio de desarrollo local
- Despliegue de producción
- Plantilla HTML sin uso
- Icono móvil estándar
- Icono móvil adaptable
- Icono de escritorio
- Icono adaptable de escritorio
- Ilustración de página no encontrada

## God Nodes (most connected - your core abstractions)
1. `ApiService` - 97 edges
2. `ApiResponse` - 83 edges
3. `@angular/core` - 64 edges
4. `AuthService` - 64 edges
5. `BusinessAdminComponent` - 48 edges
6. `AdminComponent` - 44 edges
7. `Business` - 43 edges
8. `express` - 41 edges
9. `HomeComponent` - 36 edges
10. `@angular/router` - 34 edges

## Surprising Connections (you probably didn't know these)
- `Guía para administradores de negocio` --references--> `Backend: API REST`  [INFERRED]
  docs/GUIA-ADMIN.md → backend/README.md
- `Docker Compose de pruebas` --references--> `CI workflow`  [INFERRED]
  docker-compose.test.yml → .github/workflows/ci.yml
- `Controles de seguridad de aplicación` --references--> `Backend: API REST`  [EXTRACTED]
  SECURITY_CHECKLIST.md → backend/README.md
- `Contratos de la API` --references--> `Backend: API REST`  [EXTRACTED]
  docs/API.md → backend/README.md
- `adminToken()` --calls--> `sign()`  [EXTRACTED]
  backend/test/admin.routes.test.js → backend/src/middleware/jwt.js

## Import Cycles
- None detected.

## Communities (131 total, 50 thin omitted)

### Community 0 - "Rutas y guards del frontend"
Cohesion: 0.11
Nodes (19): routes, adminGuard(), businessGuard(), customerGuard(), ownerGuard(), AccountType, AdminTab, AuthMode (+11 more)

### Community 1 - "Modelos y perfil de negocio"
Cohesion: 0.07
Nodes (26): Business, CloudinaryUploadedImage, Owner, OwnerAuthPayload, RatingStats, Review, BookingRecord, GoogleStatus (+18 more)

### Community 2 - "Panel de administración"
Cohesion: 0.06
Nodes (4): AdminComponent, MapCoordinates, MapModalComponent, leaflet

### Community 5 - "Inicio y manejo de errores backend"
Cohesion: 0.05
Nodes (40): adminRoutes, allowedOrigins, analyticsRoutes, appMetrics, auth, bookingsRoutes, businesses, cache (+32 more)

### Community 6 - "Reservas y checkout frontend"
Cohesion: 0.09
Nodes (9): getAllowedCheckoutOrigins(), isAllowedCheckoutRedirect(), normalizeAllowedOrigin(), convertTwelveHour(), formatTime24(), padTwentyFourHour(), PaymentMethod, BookingComponent (+1 more)

### Community 7 - "Pagos y moneda backend"
Cohesion: 0.07
Nodes (37): CURRENCY_LOCALES, CURRENCY_SYMBOLS, DEFAULT_CURRENCY, getLocaleForCurrency(), getSymbolForCurrency(), isValidCurrency(), normalizeCurrency(), SUPPORTED_CURRENCIES (+29 more)

### Community 8 - "Validación y repositorios"
Cohesion: 0.07
Nodes (28): clean(), isValidPhone(), validateReservation(), validateUpdate(), addService(), buildBusinessWhereClauses(), checkReservationSlotTaken(), { clean } (+20 more)

### Community 9 - "Configuración Angular"
Cohesion: 0.06
Nodes (38): cli, packageManager, prefix, projectType, root, schematics, sourceRoot, newProjectRoot (+30 more)

### Community 10 - "Autorización backend"
Cohesion: 0.08
Nodes (34): canAccessBusiness(), db, getBearerToken(), requireAdmin(), requireAdminOrOwner(), requireAuth(), requireBusinessAuth(), requireCustomer() (+26 more)

### Community 11 - "Modelos y servicios API"
Cohesion: 0.08
Nodes (5): NewBusinessPayload, ApiResponse, BookingPayload, UpdatePayload, BusinessService

### Community 13 - "Clientes y privacidad"
Cohesion: 0.07
Nodes (30): createCustomer(), customersService, deleteCustomer(), exportCustomerData(), findCustomerByEmail(), getCustomerHistory(), getCustomerProfile(), listCustomers() (+22 more)

### Community 14 - "Autenticación backend"
Cohesion: 0.08
Nodes (28): jwt, logger, sign(), authenticateAdmin(), bcrypt, db, digitsOnly(), getAdminHash() (+20 more)

### Community 16 - "Pruebas de rutas backend"
Cohesion: 0.06
Nodes (28): logger, { Pool }, app, app, businessesRoutes, db, express, request (+20 more)

### Community 17 - "Catálogo de productos y servicios"
Cohesion: 0.11
Nodes (16): CURRENCY_LOCALES, CURRENCY_SYMBOLS, CurrencyCode, DEFAULT_CURRENCY, formatCurrency(), isValidCurrency(), normalizeCurrency(), SUPPORTED_CURRENCIES (+8 more)

### Community 18 - "Generación de iconos y utilidades"
Cohesion: 0.08
Nodes (21): argIndex, dir, __dirname, files, target, chunk(), crc32(), CRC_TABLE (+13 more)

### Community 19 - "Validación y categorías API"
Cohesion: 0.09
Nodes (25): handleValidation(), { validationResult }, { body }, db, express, { handleValidation }, router, { sign } (+17 more)

### Community 20 - "Analítica y reseñas administrativas"
Cohesion: 0.10
Nodes (25): express, {
  getMarketplaceStats,
  listAllReviews,
  deleteReview,
  listAllServices,
  deleteService,
  listAdminPayments,
}, { requireAdmin }, router, { countViews }, db, deleteReview(), deleteService() (+17 more)

### Community 21 - "Servicios de negocios backend"
Cohesion: 0.13
Nodes (26): attachLiveRatings(), authenticateBusiness(), bcrypt, businessListCacheKey(), businessRepository, cache, CACHE_TTL_SECONDS, { clean } (+18 more)

### Community 22 - "Configuración TypeScript Angular"
Cohesion: 0.07
Nodes (26): angularCompilerOptions, enableI18nLegacyMessageIdFormat, strictInjectionParameters, strictInputAccessModifiers, strictTemplates, compileOnSave, compilerOptions, declaration (+18 more)

### Community 23 - "Acceso de clientes"
Cohesion: 0.16
Nodes (25): channels, cleanEmail(), cleanEmailOtpStore(), crypto, db, digitsOnly(), emailOtpRequests, findCode() (+17 more)

### Community 24 - "Interfaz y generación de horarios"
Cohesion: 0.11
Nodes (9): ENTER, EXIT, TO, Theme, ToastMessage, ToastService, ToastType, BulkSlotGeneratorComponent (+1 more)

### Community 26 - "Configuración del backend"
Cohesion: 0.08
Nodes (23): allowScripts, bcrypt@6.0.0, author, description, engines, node, pnpm, keywords (+15 more)

### Community 27 - "Rutas y límites de autenticación"
Cohesion: 0.09
Nodes (21): authLimiter, authService, { body }, customerAuthService, express, { handleValidation }, logger, makeLimiter() (+13 more)

### Community 28 - "API del catálogo de productos"
Cohesion: 0.09
Nodes (19): { body, param }, businessIdValidator, { createHash, randomUUID }, createSignature(), db, express, { handleValidation }, productBodyValidators (+11 more)

### Community 29 - "Configuración del frontend"
Cohesion: 0.08
Nodes (23): name, packageManager, private, version, @angular/animations, @angular/build, @angular/cli, @angular/compiler (+15 more)

### Community 31 - "Servicios administrativos"
Cohesion: 0.10
Nodes (5): Categoria, AdminReview, AdminServiceRecord, AdminStats, AdminService

### Community 32 - "Intercepciones HTTP y almacenamiento"
Cohesion: 0.13
Nodes (10): authInterceptor(), decodePayload(), errorInterceptor(), getActiveToken(), getRedirectForExpiry(), hasAnyRawToken(), isLoginAttempt(), isTokenValid() (+2 more)

### Community 33 - "Modelos de reserva y administración"
Cohesion: 0.10
Nodes (13): AdminFunnel, BookingRequest, CheckoutInstructions, Customer, CustomerExport, CustomerExportBooking, CustomerExportNotification, CustomerExportPayment (+5 more)

### Community 34 - "Rutas de servicios"
Cohesion: 0.10
Nodes (19): canAccessBusinessId(), { body, param, query }, { clean }, db, express, { handleValidation }, { requireAuth, canAccessBusinessId }, router (+11 more)

### Community 35 - "Integraciones Google Sheets"
Cohesion: 0.18
Nodes (19): createOAuth2Client(), createTemplateSheet(), db, disconnect(), { encrypt, decrypt }, exchangeCode(), getAuthClient(), getAuthUrl() (+11 more)

### Community 36 - "API de reservas y pruebas"
Cohesion: 0.12
Nodes (15): bookingsService, createBooking(), listBookings(), { bookingValidators }, express, { listBookings, createBooking }, router, { body } (+7 more)

### Community 37 - "Dependencias del backend"
Cohesion: 0.11
Nodes (18): dependencies, bcrypt, bcryptjs, compression, cors, dotenv, express, express-rate-limit (+10 more)

### Community 38 - "Caché backend"
Cohesion: 0.18
Nodes (15): client(), del(), delByPrefix(), get(), getRedisClient(), initRedis(), logger, memDel() (+7 more)

### Community 39 - "Datos de historias interactivas"
Cohesion: 0.20
Nodes (10): RealtimeEvent, isRecord(), parseStoryData(), requiredText(), validStory, StoryData, StoryPage, TestStoryService (+2 more)

### Community 40 - "Documentación de despliegue"
Cohesion: 0.14
Nodes (17): Guía para administradores de negocio, Arquitectura Angular, Express y PostgreSQL, Controles de seguridad de aplicación, Backend: API REST, Docker Compose local, Docker Compose de producción, Docker Compose de pruebas, Backup y restauración PostgreSQL (+9 more)

### Community 41 - "Pruebas de privacidad y acceso"
Cohesion: 0.12
Nodes (14): app, authRoutes, db, express, jwt, request, buildApp(), customersRoutes (+6 more)

### Community 42 - "Dependencias Angular"
Cohesion: 0.12
Nodes (17): dependencies, @angular/animations, @angular/common, @angular/compiler, @angular/core, @angular/forms, @angular/localize, @angular/platform-browser (+9 more)

### Community 43 - "Herramientas de compilación frontend"
Cohesion: 0.12
Nodes (17): devDependencies, @angular/build, @angular/cli, @angular/compiler-cli, autoprefixer, @axe-core/playwright, jsdom, @playwright/test (+9 more)

### Community 45 - "Tareas del monorepo"
Cohesion: 0.12
Nodes (16): dependsOn, inputs, outputs, cache, inputs, cache, globalDependencies, $schema (+8 more)

### Community 46 - "Calificaciones y reseñas API"
Cohesion: 0.15
Nodes (14): { body }, express, { handleValidation }, { listReviews, getAverageRating, createReview }, rateLimit, ratingsLimiter, router, cache (+6 more)

### Community 47 - "Notificaciones y reservas"
Cohesion: 0.17
Nodes (15): addService(), createReservation(), removeService(), updateReservation(), channels, createNotification(), db, deliverExternalNotification() (+7 more)

### Community 48 - "Canales de email y SMS"
Cohesion: 0.20
Nodes (13): consoleEmail(), consoleSms(), digitsOnly(), EMAIL_PROVIDER, httpEmail(), httpPost(), httpSms(), logger (+5 more)

### Community 49 - "Pagos y checkout frontend"
Cohesion: 0.17
Nodes (4): CheckoutSession, Payment, PaymentRequest, PaymentStatus

### Community 50 - "Configuración del workspace"
Cohesion: 0.12
Nodes (15): devDependencies, turbo, engines, node, pnpm, name, packageManager, private (+7 more)

### Community 51 - "Recordatorios de reservas"
Cohesion: 0.17
Nodes (10): setupGracefulShutdown(), startServer(), db, logger, notificationsService, runDueReminders(), startReminderWorker(), db (+2 more)

### Community 52 - "Reservas y disponibilidad"
Cohesion: 0.18
Nodes (13): { broadcastBookingCreated }, createBooking(), { createNotification }, db, listBookings(), logger, mapBooking(), { parsePagination } (+5 more)

### Community 53 - "Gestión de clientes backend"
Cohesion: 0.14
Nodes (8): db, fallbackCustomers, findOrCreateCustomer(), { listBookings }, { parsePagination }, { randomUUID }, db, { findOrCreateCustomer }

### Community 54 - "Integración API Google Sheets"
Cohesion: 0.14
Nodes (11): db, express, gsheets, logger, oauthLimiter, rateLimit, requireAnyAuth(), router (+3 more)

### Community 55 - "Etiquetas y experiencia de usuario"
Cohesion: 0.15
Nodes (11): db, express, router, express, router, uxTips, app, express (+3 more)

### Community 56 - "Eventos de reservas en tiempo real"
Cohesion: 0.21
Nodes (10): express, router, { sseHandler }, addClient(), broadcast(), broadcastBookingCreated(), broadcastBookingUpdated(), clients (+2 more)

### Community 57 - "Pruebas end-to-end de negocio"
Cohesion: 0.15
Nodes (10): app, bookingPayload, bookingsRoutes, customersRoutes, db, express, notificationsRoutes, paymentsRoutes (+2 more)

### Community 58 - "Pruebas de accesibilidad web"
Cohesion: 0.17
Nodes (5): playwrightPort, expectAccessible(), expectNoAxeViolations(), @axe-core/playwright, @playwright/test

### Community 59 - "Cobertura de código"
Cohesion: 0.17
Nodes (12): global, branches, functions, lines, statements, jest, collectCoverage, coverageDirectory (+4 more)

### Community 60 - "Pruebas de verificación OTP"
Cohesion: 0.17
Nodes (10): app, authRoutes, channels, crypto, CUSTOMER, db, express, futureExpiry (+2 more)

### Community 63 - "Sincronización de horarios"
Cohesion: 0.22
Nodes (10): bulkCreateSlots(), { clean }, db, { google }, gsheets, logger, syncAll(), syncReservations() (+2 more)

### Community 64 - "Pruebas de administración"
Cohesion: 0.20
Nodes (10): adminRoutes, adminToken(), bookingsService, buildApp(), customersService, db, express, paymentsService (+2 more)

### Community 65 - "Orquestación del checkout"
Cohesion: 0.22
Nodes (8): bookingsService, businessesService, checkoutForBusiness(), customersService, bookingsService, businessesService, { checkoutForBusiness }, customersService

### Community 66 - "Pruebas e internacionalización"
Cohesion: 0.22
Nodes (10): extract-i18n, test, builder, options, architect, buildTarget, runner, tsConfig (+2 more)

### Community 67 - "Activos y compilación Angular"
Cohesion: 0.20
Nodes (10): options, allowedCommonJsDependencies, assets, browser, index, outputPath, polyfills, scripts (+2 more)

### Community 68 - "App shell y tema visual"
Cohesion: 0.22
Nodes (5): AppComponent, rand(), appConfig, @angular/platform-browser, gsap

### Community 72 - "Migraciones de base de datos"
Cohesion: 0.22
Nodes (5): { Client }, fs, MIGRATIONS_DIR, path, pg

### Community 73 - "Pruebas de pagos"
Cohesion: 0.25
Nodes (8): buildApp(), db, express, insertedPayment, notificationsService, paymentsRoutes, request, { sign }

### Community 74 - "Objetivos de compilación Angular"
Cohesion: 0.22
Nodes (9): build, builder, configurations, defaultConfiguration, testing, aot, extractLicenses, optimization (+1 more)

### Community 75 - "Comandos del frontend"
Cohesion: 0.22
Nodes (9): scripts, build, e2e, format:check, format:fix, ng, start, test (+1 more)

### Community 79 - "Comandos del backend"
Cohesion: 0.25
Nodes (8): scripts, db:migrate, db:migrate:create, dev, start, test, test:integration, test:watch

### Community 80 - "Generación de secretos"
Cohesion: 0.25
Nodes (3): bcrypt, require, bcryptjs

### Community 82 - "Rutas de analítica"
Cohesion: 0.29
Nodes (6): analyticsService, express, rateLimit, router, viewLimiter, express-rate-limit

### Community 85 - "Servidor de desarrollo Angular"
Cohesion: 0.33
Nodes (6): serve, proxyConfig, builder, configurations, defaultConfiguration, options

### Community 86 - "Compilación de producción"
Cohesion: 0.33
Nodes (6): production, budgets, buildTarget, fileReplacements, optimization, outputHashing

### Community 91 - "Contenido de historia externa"
Cohesion: 0.40
Nodes (5): El servidor externo debe permitir solicitudes CORS desde el dominio de la aplicación, Configuración de fuente JSON externa mediante window.__APP_CONFIG__.storyDataUrl, La escena ofrece reintento si la fuente no responde o el JSON no es válido, Historia 3D: contenido del libro cargado como JSON independiente de la escena, Esquema de historia: edition, location, intro, book y pages; entre una y seis páginas

### Community 92 - "Configuración de desarrollo"
Cohesion: 0.40
Nodes (5): development, buildTarget, extractLicenses, optimization, sourceMap

### Community 93 - "Umbrales de cobertura"
Cohesion: 0.40
Nodes (5): branches, functions, lines, statements, coverageThresholds

### Community 96 - "Caché de aplicación web"
Cohesion: 0.40
Nodes (4): assetGroups, index, navigationUrls, $schema

### Community 97 - "Hoja de ruta de producto"
Cohesion: 0.40
Nodes (5): Sincronización bidireccional con Google Calendar y Outlook, Cupones, descuentos y referidos, Búsqueda de negocios full-text y geográfica, Matriz de funcionalidades candidatas para P4, Lista de espera y reasignación automática de turnos

### Community 98 - "Pruebas backend"
Cohesion: 0.50
Nodes (4): devDependencies, jest, nodemon, supertest

### Community 99 - "Registro y diagnóstico backend"
Cohesion: 0.50
Nodes (3): logger, pino, pino

### Community 100 - "Horarios y documentación frontend"
Cohesion: 0.50
Nodes (4): Generador masivo de slots: nombre, hora de inicio, duración y cantidad, Frontend Reservorio: aplicación Angular standalone con Tailwind CSS, GSAP y Leaflet, Estado global reactivo implementado con Angular Signals, Tokens JWT separados por rol y almacenados en sessionStorage o localStorage

### Community 104 - "Interfaz de historia interactiva"
Cohesion: 0.50
Nodes (4): Recorrido animado por una historia de barrio, Índice de páginas y capítulos de la historia, Datos de la historia en /assets/data/test-story.json, Controles de reproducción, salto y reinicio

### Community 105 - "Metadatos, fuentes y tema"
Cohesion: 0.50
Nodes (4): Fuentes Manrope e Inter, Reservorio, sitio para encontrar negocios locales y reservar citas, Inicialización del tema oscuro desde localStorage o preferencia del sistema, SearchAction con búsqueda mediante el parámetro q

### Community 108 - "Versiones del monorepo"
Cohesion: 0.67
Nodes (3): engines, node, pnpm

### Community 111 - "Paquetes del workspace"
Cohesion: 0.67
Nodes (3): Paquete backend del workspace pnpm, Paquete frontend del workspace pnpm, Workspace pnpm del monorepo Reservorio

## Knowledge Gaps
- **61 isolated node(s):** `dotenv`, `google-auth-library`, `jest`, `nodemon`, `@angular/animations` (+56 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1012 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **50 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@angular/core` connect `Rutas y guards del frontend` to `Intercepciones HTTP y almacenamiento`, `Modelos y perfil de negocio`, `Panel de administración`, `Datos de historias interactivas`, `SEO y navegación`, `Lista de negocios y navegación`, `Catálogo de productos y servicios`, `Interfaz y generación de horarios`, `Retorno de pagos y accesibilidad`, `Configuración del frontend`, `Servicios administrativos`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **What connects `dotenv`, `google-auth-library`, `jest` to the rest of the system?**
  _61 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Rutas y guards del frontend` be split into smaller, more focused modules?**
  _Cohesion score 0.10976430976430976 - nodes in this community are weakly interconnected._
- **Why does `express` connect `Etiquetas y experiencia de usuario` to `Inicio y manejo de errores backend`, `Pagos y moneda backend`, `Validación y repositorios`, `Autorización backend`, `Clientes y privacidad`, `Autenticación backend`, `Pruebas de rutas backend`, `Validación y categorías API`, `Analítica y reseñas administrativas`, `Configuración del backend`, `Rutas y límites de autenticación`, `API del catálogo de productos`, `Rutas de servicios`, `API de reservas y pruebas`, `Pruebas de privacidad y acceso`, `Calificaciones y reseñas API`, `Integración API Google Sheets`, `Eventos de reservas en tiempo real`, `Pruebas end-to-end de negocio`, `Pruebas de verificación OTP`, `Pruebas de administración`, `Pruebas de pagos`, `Rutas de analítica`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Should `Modelos y perfil de negocio` be split into smaller, more focused modules?**
  _Cohesion score 0.07058001397624039 - nodes in this community are weakly interconnected._
- **Why does `BusinessAdminComponent` connect `Panel de negocio propietario` to `Modelos y perfil de negocio`, `Flujos de datos de reservas`, `Catálogo de productos y servicios`, `Reservas y checkout frontend`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Should `Panel de administración` be split into smaller, more focused modules?**
  _Cohesion score 0.062040816326530614 - nodes in this community are weakly interconnected._