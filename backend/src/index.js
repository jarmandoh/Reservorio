'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { randomUUID } = require('crypto');
const express        = require('express');
const cors           = require('cors');
const helmet         = require('helmet');
const rateLimit      = require('express-rate-limit');
const db             = require('./db');


const reservations      = require('./routes/reservations.routes');
const services          = require('./routes/services.routes');
const businesses        = require('./routes/businesses.routes');
const providers         = require('./routes/providers.routes');
const auth              = require('./routes/auth.routes');
const googleOAuth       = require('./routes/google.routes');
const uxRoutes          = require('./routes/ux.routes');
const categoriesRoutes  = require('./routes/categories.routes');
const tagsRoutes        = require('./routes/tags.routes');
const customersRoutes   = require('./routes/customers.routes');
const bookingsRoutes    = require('./routes/bookings.routes');
const paymentsRoutes    = require('./routes/payments.routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3000;
const appMetrics = {
  startTime: Date.now(),
  requests: 0,
  errors: 0,
};

function validateRuntimeConfig() {
  const env = process.env.NODE_ENV || 'development';

  if (env === 'production') {
    if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes('postgres')) {
      throw new Error('DATABASE_URL inválida o ausente en producción');
    }

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción');
    }

    if (!process.env.CORS_ORIGINS || !process.env.CORS_ORIGINS.split(',').map(v => v.trim()).filter(Boolean).length) {
      throw new Error('CORS_ORIGINS debe contener al menos un origen válido en producción');
    }
  }

  return true;
}

// ── Security headers ────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:4200,http://localhost:3000')
  .split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    // Permitir requests sin origen (eg. Postman, Docker health checks)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origen no permitido → ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Demasiadas peticiones, inténtalo más tarde.' },
});
app.use('/api/', limiter);

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));

// ── Request tracing + counters ──────────────────────────────────────────────
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || randomUUID();
  res.set('X-Request-Id', req.requestId);
  appMetrics.requests += 1;
  console.log(`[${req.requestId}] ${req.method} ${req.originalUrl}`);
  next();
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/reservations', reservations);
app.use('/api/services',     services);
app.use('/api/businesses',   businesses);
app.use('/api/providers',    providers);
app.use('/api/customers',    customersRoutes);
app.use('/api/bookings',     bookingsRoutes);
app.use('/api/payments',     paymentsRoutes);
app.use('/api/auth',         auth);
app.use('/api/google',       googleOAuth);
app.use('/api/categories',   categoriesRoutes);
app.use('/api/tags',         tagsRoutes);
app.use('/api/ux-tips',      uxRoutes);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    return res.status(200).json({
      ok: true,
      service: 'reservorio-api',
      status: 'ok',
      database: 'connected',
      uptime: process.uptime(),
    });
  } catch (error) {
    return res.status(503).json({
      ok: false,
      service: 'reservorio-api',
      status: 'degraded',
      database: 'disconnected',
      uptime: process.uptime(),
      message: 'Database unavailable',
    });
  }
});

app.get('/metrics', (_req, res) => {
  const memory = process.memoryUsage();

  return res.status(200).json({
    ok: true,
    service: 'reservorio-api',
    uptime: process.uptime(),
    requests: appMetrics.requests,
    errors: appMetrics.errors,
    startedAt: new Date(appMetrics.startTime).toISOString(),
    memory: {
      rss: memory.rss,
      heapTotal: memory.heapTotal,
      heapUsed: memory.heapUsed,
      external: memory.external,
    },
    nodeVersion: process.version,
    platform: process.platform,
  });
});

app.use((err, req, res, next) => {
  appMetrics.errors += 1;
  return errorHandler(err, req, res, next);
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use(notFound);

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

function startServer() {
  const server = app.listen(PORT, async () => {
    console.log(`[reservorio-api] corriendo en http://localhost:${PORT}`);
    if (!process.env.DATABASE_URL) console.warn('[WARN] DATABASE_URL no configurado en .env');
    if (!process.env.ADMIN_PIN)    console.warn('[WARN] ADMIN_PIN no configurado — usando "1234" por defecto');
    if (!process.env.JWT_SECRET)   console.warn('[WARN] JWT_SECRET no configurado — usando secreto inseguro');

    // Google OAuth warnings
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.warn('[WARN] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET no configurados — OAuth deshabilitado');
    }
    if (process.env.GOOGLE_CLIENT_ID && (!process.env.GOOGLE_TOKENS_KEY || process.env.GOOGLE_TOKENS_KEY.length !== 64)) {
      console.warn('[WARN] GOOGLE_TOKENS_KEY ausente o inválida (requiere 64 chars hex) — cifrado de tokens fallará');
    }

    try {
      await db.query('SELECT 1');
      console.log('[DB] Conexion a PostgreSQL establecida');
    } catch (e) {
      console.error('[DB] No se pudo conectar a PostgreSQL:', e.message);
    }
  });

  return server;
}

if (require.main === module) {
  validateRuntimeConfig();
  startServer();
}

module.exports = { app, startServer, validateRuntimeConfig };
