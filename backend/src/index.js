'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { randomUUID } = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const db = require('./db');
const logger = require('./logger');
const cache = require('./cache');
const promClient = require('prom-client');

// ── Prometheus registry ──────────────────────────────────────────────────────
const promRegistry = new promClient.Registry();
promClient.collectDefaultMetrics({ register: promRegistry, prefix: 'reservorio_' });

const httpRequestsTotal = new promClient.Counter({
  name: 'reservorio_http_requests_total',
  help: 'Total de peticiones HTTP',
  labelNames: ['method', 'route', 'status'],
  registers: [promRegistry],
});

const httpRequestDuration = new promClient.Histogram({
  name: 'reservorio_http_request_duration_seconds',
  help: 'Duración de peticiones HTTP en segundos',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2.5, 5],
  registers: [promRegistry],
});

const reservations = require('./routes/reservations.routes');
const services = require('./routes/services.routes');
const businesses = require('./routes/businesses.routes');
const providers = require('./routes/providers.routes');
const auth = require('./routes/auth.routes');
const googleOAuth = require('./routes/google.routes');
const uxRoutes = require('./routes/ux.routes');
const categoriesRoutes = require('./routes/categories.routes');
const tagsRoutes = require('./routes/tags.routes');
const customersRoutes = require('./routes/customers.routes');
const bookingsRoutes = require('./routes/bookings.routes');
const paymentsRoutes = require('./routes/payments.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const ratingsRoutes = require('./routes/ratings.routes');
const adminRoutes = require('./routes/admin.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const realtimeRoutes = require('./routes/realtime.routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;
const appMetrics = {
  startTime: Date.now(),
  requests: 0,
  errors: 0,
  statusCodes: {},
};

// Ventana deslizante de latencias para percentiles (media móvil).
const LATENCY_WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const MAX_LATENCY_SAMPLES = 10000;
const latencySamples = [];

function percentiles(values, ps) {
  if (!values.length) return Object.fromEntries(ps.map(p => ['p' + p, null]));
  const sorted = [...values].sort((a, b) => a - b);
  const out = {};
  for (const p of ps) {
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
    out['p' + p] = Math.round(sorted[index] * 10) / 10;
  }
  return out;
}

function validateRuntimeConfig() {
  const env = process.env.NODE_ENV || 'development';

  if (env === 'production') {
    if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes('postgres')) {
      throw new Error('DATABASE_URL inválida o ausente en producción');
    }

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción');
    }

    const adminPin = String(process.env.ADMIN_PIN ?? '');
    const hasAdminHash = /^\$2[aby]\$/.test(String(process.env.ADMIN_PIN_HASH ?? '').trim());
    if (!hasAdminHash && (!adminPin || adminPin === '1234' || adminPin.length < 6)) {
      throw new Error(
        'ADMIN_PIN debe configurarse con una clave segura (≠ 1234, ≥ 6 caracteres) o definirse ADMIN_PIN_HASH (bcrypt) en producción'
      );
    }

    if (
      !process.env.CORS_ORIGINS ||
      !process.env.CORS_ORIGINS.split(',')
        .map(v => v.trim())
        .filter(Boolean).length
    ) {
      throw new Error('CORS_ORIGINS debe contener al menos un origen válido en producción');
    }

    const frontendUrl = String(process.env.FRONTEND_URL ?? '').trim();
    if (!/^https:\/\//.test(frontendUrl)) {
      throw new Error('FRONTEND_URL debe ser una URL https:// válida en producción (se usa en los magic-links y CORS)');
    }

    if (String(process.env.OTP_DEBUG ?? '').toLowerCase() === '1') {
      logger.warn(
        'OTP_DEBUG=1 está ACTIVO en producción: los códigos one-time se exponen en las respuestas. Desactívalo.'
      );
    }
  }

  return true;
}

// ── Trust proxy (necesario tras nginx para X-Forwarded-For correcto) ───────────
// TRUST_PROXY=0 desactiva, 1 es el default (un salto: nginx). Acepta número o IP.
const trustProxy = process.env.TRUST_PROXY ?? '1';
if (String(trustProxy) !== '0') {
  const val = /^\d+$/.test(String(trustProxy)) ? parseInt(String(trustProxy), 10) : String(trustProxy);
  app.set('trust proxy', val);
}

// ── Security headers ────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// ── Compresión gzip/deflate (ahorra ~70% en JSON, cacheado por nginx también) ──
app.use(
  compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    },
    threshold: 1024, // solo >1kb
  })
);

// ── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:4200,http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      // Permitir requests sin origen (eg. Postman, Docker health checks)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origen no permitido → ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Rate limiting ────────────────────────────────────────────────────────────
const rateLimitMax = Number.isInteger(Number(process.env.RATE_LIMIT_MAX)) ? Number(process.env.RATE_LIMIT_MAX) : 60;
if (!Number.isInteger(rateLimitMax) || rateLimitMax < 60) {
  throw new Error('RATE_LIMIT_MAX debe ser un entero >= 60');
}

// Store distribuido: Redis si REDIS_URL está definido, MemoryStore (default) si no.
let redisStore;
if (String(process.env.REDIS_URL || '').trim()) {
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies, global-require
    const { RedisStore } = require('rate-limit-redis');
    const client = cache.getRedisClient() || cache.initRedis();
    if (client) {
      redisStore = new RedisStore({
        // rate-limit-redis v4 usa sendCommand; compat con ioredis
        sendCommand: (...args) => client.call(...args),
        prefix: 'rl:global:',
      });
      logger.info('[rate-limit] usando RedisStore distribuido');
    }
  } catch (e) {
    logger.warn('[rate-limit] RedisStore no disponible, fallback a MemoryStore:', e.message);
  }
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000 * 1000000, // 15 minutos
  max: rateLimitMax,
  store: redisStore,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Demasiadas peticiones, inténtalo más tarde.' },
});
app.use('/api/', limiter);

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: process.env.JSON_LIMIT || '100kb' }));

// ── Request tracing + counters + logging estructurado ───────────────────────
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || randomUUID();
  res.set('X-Request-Id', req.requestId);
  appMetrics.requests += 1;
  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6;
    appMetrics.statusCodes[res.statusCode] = (appMetrics.statusCodes[res.statusCode] || 0) + 1;
    if (res.statusCode >= 500) appMetrics.errors += 1;

    latencySamples.push({ ts: Date.now(), ms: durationMs });
    if (latencySamples.length > MAX_LATENCY_SAMPLES) latencySamples.shift();

    // Prometheus
    try {
      const route =
        req.route && req.route.path
          ? `${req.baseUrl || ''}${req.route.path}`
          : req.path || req.originalUrl.split('?')[0];
      const labels = { method: req.method, route, status: String(res.statusCode) };
      httpRequestsTotal.inc(labels);
      httpRequestDuration.observe(labels, durationMs / 1000);
    } catch { }

    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level](
      {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 10) / 10,
      },
      'http request'
    );
  });

  next();
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/reservations', reservations);
app.use('/api/services', services);
app.use('/api/businesses', businesses);
app.use('/api/providers', providers);
app.use('/api/customers', customersRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', auth);
app.use('/api/google', googleOAuth);
app.use('/api/categories', categoriesRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/ux-tips', uxRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/realtime', realtimeRoutes);

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

app.get('/metrics', async (req, res) => {
  // Prometheus exposition si el cliente lo pide (Grafana / Prometheus)
  const accept = String(req.headers.accept || '');
  const wantsProm = accept.includes('text/plain') || String(req.query.format || '').toLowerCase() === 'prometheus';
  if (wantsProm) {
    try {
      res.set('Content-Type', promRegistry.contentType);
      return res.send(await promRegistry.metrics());
    } catch (e) {
      logger.error('[metrics] prom error:', e.message);
      // fallback a JSON
    }
  }

  const memory = process.memoryUsage();

  const now = Date.now();
  const windowStart = now - LATENCY_WINDOW_MS;
  const inWindow = latencySamples.filter(sample => sample.ts >= windowStart).map(sample => sample.ms);
  const latency = percentiles(inWindow, [50, 95, 99]);

  return res.status(200).json({
    ok: true,
    service: 'reservorio-api',
    uptime: process.uptime(),
    requests: appMetrics.requests,
    errors: appMetrics.errors,
    statusCodes: appMetrics.statusCodes,
    latency: {
      ...latency,
      samples: inWindow.length,
      windowMs: LATENCY_WINDOW_MS,
    },
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

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use(notFound);

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

let reminderIntervalRef = null;

function setupGracefulShutdown(server) {
  let shuttingDown = false;

  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`[shutdown] ${signal} recibido, cerrando...`);

    if (reminderIntervalRef) {
      try {
        clearInterval(reminderIntervalRef);
      } catch { }
      reminderIntervalRef = null;
    }

    // Dejar de aceptar conexiones nuevas
    server.close(async () => {
      logger.info('[shutdown] servidor HTTP cerrado');
      try {
        await db.end();
        logger.info('[shutdown] pool de DB cerrado');
      } catch (e) {
        logger.error('[shutdown] error al cerrar pool:', e.message);
      }
      try {
        await cache.quit();
        logger.info('[shutdown] cache/redis cerrado');
      } catch (e) {
        logger.error('[shutdown] error al cerrar cache:', e.message);
      }
      process.exit(0);
    });

    // Fallback: forzar salida si no cierra en 10s
    setTimeout(() => {
      logger.error('[shutdown] timeout, forzando salida');
      process.exit(1);
    }, 10000).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', err => {
    logger.error('[uncaughtException]', err?.stack || err?.message || err);
    shutdown('uncaughtException');
  });
  process.on('unhandledRejection', reason => {
    logger.error('[unhandledRejection]', reason);
  });
}

function startServer() {
  const server = app.listen(PORT, async () => {
    logger.info(`[reservorio-api] corriendo en http://localhost:${PORT}`);
    if (!process.env.DATABASE_URL) logger.warn('[WARN] DATABASE_URL no configurado en .env');
    if (!process.env.ADMIN_PIN) logger.warn('[WARN] ADMIN_PIN no configurado — usando "1234" por defecto');
    if (!process.env.JWT_SECRET) logger.warn('[WARN] JWT_SECRET no configurado — usando secreto inseguro');
    if (process.env.OTP_DEBUG === '1' && (process.env.NODE_ENV || 'development') === 'production') {
      logger.warn('[WARN] OTP_DEBUG=1 está activo en producción — los códigos de acceso se exponen en la respuesta');
    }

    // Worker de recordatorios (opt-in; no corre en tests)
    if (process.env.ENABLE_REMINDER_WORKER === '1') {
      const { startReminderWorker } = require('./services/reminders.worker');
      reminderIntervalRef = startReminderWorker();
      logger.info('[reminders] worker de recordatorios habilitado');
    }

    // Google OAuth warnings
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      logger.warn('[WARN] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET no configurados — OAuth deshabilitado');
    }
    if (
      process.env.GOOGLE_CLIENT_ID &&
      (!process.env.GOOGLE_TOKENS_KEY || process.env.GOOGLE_TOKENS_KEY.length !== 64)
    ) {
      logger.warn('[WARN] GOOGLE_TOKENS_KEY ausente o inválida (requiere 64 chars hex) — cifrado de tokens fallará');
    }

    if (process.env.REDIS_URL) {
      logger.info('[Redis] REDIS_URL configurado, intentando conectar...');
      cache.initRedis();
    }

    try {
      await db.query('SELECT 1');
      logger.info('[DB] Conexion a PostgreSQL establecida');
    } catch (e) {
      logger.error('[DB] No se pudo conectar a PostgreSQL:', e.message);
    }
  });

  setupGracefulShutdown(server);

  return server;
}

if (require.main === module) {
  validateRuntimeConfig();
  startServer();
}

module.exports = { app, startServer, validateRuntimeConfig, setupGracefulShutdown };
