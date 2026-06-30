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
const auth              = require('./routes/auth.routes');
const googleOAuth       = require('./routes/google.routes');
const uxRoutes          = require('./routes/ux.routes');
const categoriesRoutes  = require('./routes/categories.routes');
const tagsRoutes        = require('./routes/tags.routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Security headers ────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:4200' || 'http://localhost:3000')
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
// ── Request tracing ─────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || randomUUID();
  res.set('X-Request-Id', req.requestId);
  console.log(`[${req.requestId}] ${req.method} ${req.originalUrl}`);
  next();
});
// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/reservations', reservations);
app.use('/api/services',     services);
app.use('/api/businesses',   businesses);
app.use('/api/auth',         auth);
app.use('/api/google',       googleOAuth);
app.use('/api/categories',   categoriesRoutes);
app.use('/api/tags',         tagsRoutes);
app.use('/api/ux-tips',      uxRoutes);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true, service: 'reservorio-api' }));

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use(notFound);

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
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
