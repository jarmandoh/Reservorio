'use strict';

const express          = require('express');
const rateLimit        = require('express-rate-limit');
const { sign, verify } = require('../middleware/jwt');
const db               = require('../db');
const gsheets          = require('../services/googleSheets');
const { syncAll }      = require('../services/syncService');

const router = express.Router();

// ── Rate limiter específico para OAuth (más estricto) ────────────────────
const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Demasiados intentos OAuth, inténtalo más tarde.' },
});

const syncLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Demasiadas sincronizaciones, inténtalo más tarde.' },
});

// ── Validación de formatos ───────────────────────────────────────────────
const SHEET_ID_RE = /^[a-zA-Z0-9_-]{20,60}$/;

function isValidSheetId(id) {
  return typeof id === 'string' && SHEET_ID_RE.test(id);
}

// ── Auth middleware (reutiliza lógica de businesses.routes) ───────────────

function requireAnyAuth(req, res, next) {
  const hdr = req.headers.authorization;
  if (!hdr?.startsWith('Bearer ')) return res.status(401).json({ ok: false, message: 'Token requerido' });
  try {
    req.authPayload = verify(hdr.slice(7));
    next();
  } catch { res.status(401).json({ ok: false, message: 'Token invalido o expirado' }); }
}

function canAccessBusiness(req, res) {
  const p = req.authPayload;
  if (p.role === 'admin') return true;
  if (p.role === 'business-admin' && p.businessId === req.params.businessId) return true;
  res.status(403).json({ ok: false, message: 'Sin acceso a este negocio' });
  return false;
}

// ══ ROUTES ════════════════════════════════════════════════════════════════

/**
 * GET /api/google/start/:businessId
 * Redirige al flujo de consentimiento de Google OAuth 2.0.
 * Requiere token admin o business-admin del negocio.
 */
router.get('/start/:businessId', oauthLimiter, requireAnyAuth, (req, res) => {
  if (!canAccessBusiness(req, res)) return;

  // state = JWT firmado con businessId + timestamp (CSRF protection, 10 min)
  const state = sign({ businessId: req.params.businessId, purpose: 'google_oauth' }, '10m');
  const url   = gsheets.getAuthUrl(state);
  res.json({ ok: true, url });
});

/**
 * GET /api/google/callback?code=xxx&state=yyy
 * Google redirige aquí tras autorización.
 * NO requiere Authorization header (viene de Google redirect).
 */
router.get('/callback', oauthLimiter, async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.status(400).json({ ok: false, message: `Google OAuth error: ${error}` });
  }
  if (!code || !state) {
    return res.status(400).json({ ok: false, message: 'Faltan parámetros code o state.' });
  }

  // Validar state (CSRF)
  let payload;
  try {
    payload = verify(state);
  } catch {
    return res.status(400).json({ ok: false, message: 'State inválido o expirado.' });
  }
  if (payload.purpose !== 'google_oauth' || !payload.businessId) {
    return res.status(400).json({ ok: false, message: 'State inválido.' });
  }

  const businessId = payload.businessId;

  // Verificar que el negocio existe
  const { rows } = await db.query('SELECT id, name FROM businesses WHERE id = $1', [businessId]);
  if (!rows.length) {
    return res.status(404).json({ ok: false, message: 'Negocio no encontrado.' });
  }

  try {
    // Intercambiar code por tokens
    const tokens = await gsheets.exchangeCode(code);
    const email  = await gsheets.getUserEmail(tokens.access_token);

    // Guardar tokens cifrados
    await gsheets.saveTokens(businessId, tokens, email);

    // Redirigir al frontend — usar el ID de la BD (no del state) para evitar inyección en URL
    const safeId = rows[0].id.replace(/[^a-zA-Z0-9_-]/g, '');
    const frontendUrl = (process.env.CORS_ORIGINS || 'http://localhost:4200').split(',')[0].trim();
    res.redirect(`${frontendUrl}/business/${encodeURIComponent(safeId)}/admin?google=linked`);
  } catch (e) {
    console.error('[Google OAuth] Error en callback:', e.message);
    res.status(500).json({ ok: false, message: 'Error al vincular cuenta Google.' });
  }
});

/**
 * GET /api/google/status/:businessId
 * Devuelve estado de vinculación Google del negocio.
 */
router.get('/status/:businessId', requireAnyAuth, async (req, res) => {
  if (!canAccessBusiness(req, res)) return;

  try {
    const { rows } = await db.query(
      'SELECT google_email, google_sheet_id, google_token_expiry FROM businesses WHERE id = $1',
      [req.params.businessId]
    );
    if (!rows.length) return res.status(404).json({ ok: false, message: 'Negocio no encontrado.' });

    const biz = rows[0];
    res.json({
      ok: true,
      data: {
        linked:     !!biz.google_email,
        email:      biz.google_email || null,
        sheetId:    biz.google_sheet_id || null,
        tokenExpiry: biz.google_token_expiry || null,
      },
    });
  } catch (e) { 
    console.error('[Google] Error status:', e.message);
    res.status(500).json({ ok: false, message: 'Error al consultar estado de Google.' }); 
  }
});

/**
 * POST /api/google/disconnect/:businessId
 * Revoca tokens y desvincula Google del negocio.
 */
router.post('/disconnect/:businessId', requireAnyAuth, async (req, res) => {
  if (!canAccessBusiness(req, res)) return;

  try {
    await gsheets.disconnect(req.params.businessId);
    res.json({ ok: true, message: 'Cuenta Google desvinculada.' });
  } catch (e) {
    console.error('[Google] Error disconnect:', e.message);
    res.status(500).json({ ok: false, message: 'Error al desvincular cuenta Google.' });
  }
});

/**
 * POST /api/google/create-sheet/:businessId
 * Crea una spreadsheet template y la vincula al negocio.
 */
router.post('/create-sheet/:businessId', requireAnyAuth, async (req, res) => {
  if (!canAccessBusiness(req, res)) return;

  try {
    const { rows } = await db.query('SELECT name, google_email FROM businesses WHERE id = $1', [req.params.businessId]);
    if (!rows.length) return res.status(404).json({ ok: false, message: 'Negocio no encontrado.' });
    if (!rows[0].google_email) return res.status(400).json({ ok: false, message: 'Primero vincula tu cuenta Google.' });

    const sheetId = await gsheets.createTemplateSheet(req.params.businessId, rows[0].name);
    res.json({ ok: true, message: 'Spreadsheet creada.', sheetId });
  } catch (e) {
    console.error('[Google] Error create-sheet:', e.message);
    res.status(500).json({ ok: false, message: 'Error al crear spreadsheet.' });
  }
});

/**
 * POST /api/google/link-sheet/:businessId
 * Vincula una spreadsheet existente al negocio.
 * Body: { sheetId: "xxx" }
 */
router.post('/link-sheet/:businessId', requireAnyAuth, async (req, res) => {
  if (!canAccessBusiness(req, res)) return;

  const { sheetId } = req.body;
  if (!sheetId || typeof sheetId !== 'string') {
    return res.status(400).json({ ok: false, message: 'sheetId requerido.' });
  }
  if (!isValidSheetId(sheetId)) {
    return res.status(400).json({ ok: false, message: 'Formato de sheetId inválido.' });
  }

  try {
    // Verificar que podemos acceder a la sheet
    const { google } = require('googleapis');
    const auth   = await gsheets.getAuthClient(req.params.businessId);
    const sheets = google.sheets({ version: 'v4', auth });
    await sheets.spreadsheets.get({ spreadsheetId: sheetId });

    await db.query('UPDATE businesses SET google_sheet_id = $1 WHERE id = $2', [sheetId, req.params.businessId]);
    res.json({ ok: true, message: 'Spreadsheet vinculada.' });
  } catch (e) {
    if (e.code === 404 || e.code === 403) {
      return res.status(400).json({ ok: false, message: 'No se puede acceder a esa spreadsheet. Verifica el ID y permisos.' });
    }
    console.error('[Google] Error link-sheet:', e.message);
    res.status(500).json({ ok: false, message: 'Error al vincular spreadsheet.' });
  }
});

/**
 * POST /api/google/sync/:businessId
 * Sincronización manual: vuelca reservas + servicios de PG → Google Sheets.
 */
router.post('/sync/:businessId', syncLimiter, requireAnyAuth, async (req, res) => {
  if (!canAccessBusiness(req, res)) return;

  try {
    const { rows } = await db.query(
      'SELECT google_sheet_id, google_access_token FROM businesses WHERE id = $1',
      [req.params.businessId]
    );
    if (!rows.length) return res.status(404).json({ ok: false, message: 'Negocio no encontrado.' });
    if (!rows[0].google_access_token) return res.status(400).json({ ok: false, message: 'Google no vinculado.' });
    if (!rows[0].google_sheet_id) return res.status(400).json({ ok: false, message: 'No hay spreadsheet vinculada.' });

    await syncAll(req.params.businessId);
    res.json({ ok: true, message: 'Sincronización completada.' });
  } catch (e) {
    console.error('[Sync] Error manual:', e.message);
    res.status(500).json({ ok: false, message: 'Error al sincronizar.' });
  }
});

module.exports = router;
