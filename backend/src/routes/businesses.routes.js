'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { body, param } = require('express-validator');
const { sign } = require('../middleware/jwt');
const { clean } = require('../middleware/sanitize');
const { requireAdmin, requireBusinessAuth } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validation');
const db = require('../db');
const { syncInBackground } = require('../services/syncService');

const router = express.Router();

function safeBiz(b) {
  return {
    id:          b.id,
    name:        b.name,
    category:    b.category,
    description: b.description,
    location:    b.location,
    rating:      Number(b.rating),
    reviews:     b.reviews,
    tags:        b.tags ? b.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    gradient:    b.gradient,
    icon:        b.icon,
    schedule:    b.schedule,
    logo:        b.logo,
    phone:       b.phone,
    active:      b.active,
    available:   0,
    total:       0,
    routePath:   `/booking/${b.id}`,
  };
}

const businessCreateValidators = [
  body('name').trim().notEmpty().withMessage('name requerido'),
  body('category').trim().notEmpty().withMessage('category requerido'),
  body('pin').trim().notEmpty().withMessage('pin requerido'),
  body('rating').optional().isFloat({ min: 0, max: 5 }).withMessage('rating inválido'),
  body('reviews').optional().isInt({ min: 0 }).withMessage('reviews inválido'),
  handleValidation,
];

const businessUpdateValidators = [
  param('id').trim().notEmpty().withMessage('id requerido'),
  body('rating').optional().isFloat({ min: 0, max: 5 }).withMessage('rating inválido'),
  body('reviews').optional().isInt({ min: 0 }).withMessage('reviews inválido'),
  body('pin').optional().trim().notEmpty().withMessage('pin requerido'),
  handleValidation,
];

const reservationValidators = [
  body('franja').trim().notEmpty().withMessage('franja requerido'),
  body('cliente').trim().notEmpty().withMessage('cliente requerido'),
  body('telefono').trim().notEmpty().withMessage('telefono requerido')
    .matches(/^[0-9+\s\-]{7,15}$/).withMessage('telefono inválido'),
  body('servicio').optional().trim().isLength({ max: 100 }).withMessage('servicio demasiado largo'),
  body('notas').optional().trim().isLength({ max: 500 }).withMessage('notas demasiado largas'),
  handleValidation,
];

const reservationUpdateValidators = [
  param('row').toInt().isInt({ min: 1 }).withMessage('ID de reserva invalido'),
  body('disponibilidad').trim().isIn(['Disponible', 'Pendiente', 'Reservado', 'Confirmado']).withMessage('Estado no permitido'),
  body('notas').optional().trim().isLength({ max: 500 }).withMessage('notas demasiado largas'),
  handleValidation,
];

const serviceValidators = [
  body('nombre').trim().notEmpty().withMessage('nombre requerido').isLength({ max: 100 }).withMessage('nombre demasiado largo'),
  handleValidation,
];

const serviceNameParamValidator = [
  param('nombre').trim().notEmpty().withMessage('nombre requerido'),
  handleValidation,
];

// GET /api/businesses  -> activos, publico
router.get('/', async (_req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM businesses WHERE active = true ORDER BY name');
    res.json({ ok: true, data: rows.map(safeBiz) });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// GET /api/businesses/all  -> todos (solo admin)
router.get('/all', requireAdmin, async (_req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM businesses ORDER BY name');
    res.json({ ok: true, data: rows.map(safeBiz) });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// POST /api/businesses/:id/auth  -> login con PIN del negocio
router.post('/:id/auth', async (req, res) => {
  const pin = String(req.body?.pin ?? '');
  if (!pin) return res.status(400).json({ ok: false, message: 'pin requerido' });

  try {
    const { rows } = await db.query('SELECT * FROM businesses WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ ok: false, message: 'Negocio no encontrado' });
    const biz = rows[0];
    if (!biz.pin_hash) return res.status(503).json({ ok: false, message: 'PIN no configurado para este negocio' });
    const valid = await bcrypt.compare(pin, biz.pin_hash);
    if (!valid) return res.status(401).json({ ok: false, message: 'PIN incorrecto' });
    const token = sign({ businessId: biz.id, role: 'business-admin' });
    res.json({ ok: true, data: { token, business: safeBiz(biz) } });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// POST /api/businesses  -> crear negocio (solo admin)
router.post('/', requireAdmin, businessCreateValidators, async (req, res) => {
  const { name, category, description, location, rating, reviews, tags, gradient, icon, schedule, logo, phone, pin } = req.body ?? {};
  const id = clean(name).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) + '_' + Date.now().toString(36);
  const pinHash = await bcrypt.hash(String(pin), 10);
  const tagsStr = Array.isArray(tags) ? tags.join(',') : clean(tags ?? '');

  try {
    await db.query(
      `INSERT INTO businesses
         (id, name, category, description, location, rating, reviews,
          tags, gradient, icon, schedule, logo, phone, active, pin_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        id,
        clean(name), clean(category), clean(description ?? ''), clean(location ?? ''),
        Number(rating ?? 5.0), Number(reviews ?? 0),
        tagsStr,
        clean(gradient ?? 'linear-gradient(135deg,#005bbf,#1a73e8)'),
        clean(icon ?? 'store'), clean(schedule ?? ''), clean(logo ?? ''), clean(phone ?? ''),
        true, pinHash,
      ]
    );

    const { rows } = await db.query('SELECT * FROM businesses WHERE id = $1', [id]);
    res.status(201).json({ ok: true, data: safeBiz(rows[0]) });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// PUT /api/businesses/:id  -> actualizar (admin o propio business-admin)
router.put('/:id', requireBusinessAuth, businessUpdateValidators, async (req, res) => {
  const sets = [];
  const vals = [];
  let idx = 1;

  const strFields = ['name', 'category', 'description', 'location', 'gradient', 'icon', 'schedule', 'logo', 'phone'];
  for (const k of strFields) {
    if (req.body?.[k] !== undefined) {
      sets.push(`${k} = $${idx++}`);
      vals.push(clean(req.body[k]));
    }
  }

  if (req.body?.rating !== undefined) { sets.push(`rating = $${idx++}`); vals.push(Number(req.body.rating)); }
  if (req.body?.reviews !== undefined) { sets.push(`reviews = $${idx++}`); vals.push(Number(req.body.reviews)); }
  if (req.body?.tags !== undefined) {
    const t = Array.isArray(req.body.tags) ? req.body.tags.join(',') : clean(req.body.tags);
    sets.push(`tags = $${idx++}`); vals.push(t);
  }
  if (req.body?.pin !== undefined) {
    sets.push(`pin_hash = $${idx++}`);
    vals.push(await bcrypt.hash(String(req.body.pin), 10));
  }

  if (!sets.length) return res.status(400).json({ ok: false, message: 'Sin campos para actualizar' });
  vals.push(req.params.id);

  try {
    const result = await db.query(`UPDATE businesses SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, vals);
    if (!result.rows.length) return res.status(404).json({ ok: false, message: 'Negocio no encontrado' });
    res.json({ ok: true, data: safeBiz(result.rows[0]) });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// PATCH /api/businesses/:id/toggle  -> activar/desactivar (solo admin)
router.patch('/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const result = await db.query('UPDATE businesses SET active = NOT active WHERE id = $1 RETURNING *', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ ok: false, message: 'Negocio no encontrado' });
    res.json({ ok: true, data: safeBiz(result.rows[0]) });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// DELETE /api/businesses/:id  -> eliminar negocio (solo admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM businesses WHERE id = $1 RETURNING *', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ ok: false, message: 'Negocio no encontrado' });
    res.json({ ok: true, data: safeBiz(result.rows[0]) });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// ── Per-business reservations ─────────────────────────────────────────────

// GET /api/businesses/:id/reservations
router.get('/:id/reservations', requireBusinessAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM reservations WHERE business_id = $1 ORDER BY franja', [req.params.id]);
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// POST /api/businesses/:id/reservations
router.post(`/:id/reservations`, reservationValidators, async (req, res) => {
  const { franja, cliente, telefono, servicio, notas } = req.body ?? {};

  try {
    const { rows: bizRows } = await db.query('SELECT id FROM businesses WHERE id = $1 AND active = true', [req.params.id]);
    if (!bizRows.length) return res.status(404).json({ ok: false, message: 'Negocio no encontrado' });

    const { rows: taken } = await db.query(`SELECT id FROM reservations WHERE business_id = $1 AND franja = $2 AND disponibilidad != 'Disponible'`, [req.params.id, clean(franja)]);
    if (taken.length) return res.status(409).json({ ok: false, message: 'Franja no disponible' });

    const { rows } = await db.query(`INSERT INTO reservations (business_id, franja, disponibilidad, cliente, telefono, servicio, notas)
       VALUES ($1,$2,'Reservado',$3,$4,$5,$6) RETURNING *`, [req.params.id, clean(franja), clean(cliente), clean(telefono), clean(servicio ?? ''), clean(notas ?? '')]);
    syncInBackground(req.params.id, 'reservations');
    res.status(201).json({ ok: true, data: rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// PUT /api/businesses/:id/reservations/:row
router.put('/:id/reservations/:row', requireBusinessAuth, reservationUpdateValidators, async (req, res) => {
  const reservaId = parseInt(req.params.row, 10);
  try {
    const result = await db.query(`UPDATE reservations SET disponibilidad = $1, notas = $2, updated_at = now()
       WHERE id = $3 AND business_id = $4 RETURNING *`, [clean(req.body.disponibilidad), clean(req.body?.notas ?? ''), reservaId, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ ok: false, message: 'Reserva no encontrada' });
    syncInBackground(req.params.id, 'reservations');
    res.json({ ok: true, data: result.rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// ── Per-business services ─────────────────────────────────────────────────

// GET /api/businesses/:id/services
router.get('/:id/services', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT nombre FROM services WHERE business_id = $1 ORDER BY nombre', [req.params.id]);
    res.json({ ok: true, data: rows.map((r) => r.nombre) });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// POST /api/businesses/:id/services
router.post('/:id/services', requireBusinessAuth, serviceValidators, async (req, res) => {
  const nombre = clean(req.body?.nombre ?? '');
  try {
    await db.query('INSERT INTO services (business_id, nombre) VALUES ($1, $2)', [req.params.id, nombre]);
    syncInBackground(req.params.id, 'services');
    res.status(201).json({ ok: true, data: { nombre } });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ ok: false, message: 'Servicio ya existe' });
    res.status(500).json({ ok: false, message: e.message });
  }
});

// DELETE /api/businesses/:id/services/:nombre
router.delete('/:id/services/:nombre', requireBusinessAuth, serviceNameParamValidator, async (req, res) => {
  const nombre = clean(decodeURIComponent(req.params.nombre ?? ''));
  try {
    const result = await db.query('DELETE FROM services WHERE business_id = $1 AND nombre = $2', [req.params.id, nombre]);
    if (!result.rowCount) return res.status(404).json({ ok: false, message: 'Servicio no encontrado' });
    syncInBackground(req.params.id, 'services');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
