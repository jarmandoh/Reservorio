'use strict';

const express  = require('express');
const { body, param, query } = require('express-validator');
const { validateReservation, validateUpdate, clean } = require('../middleware/sanitize');
const { requireAuth, canAccessBusinessId } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validation');
const db = require('../db');
const { syncInBackground } = require('../services/syncService');

const router = express.Router();

const reservationCreateValidators = [
  body('businessId').trim().notEmpty().withMessage('businessId requerido'),
  body('franja').trim().notEmpty().withMessage('franja requerido'),
  body('cliente').trim().notEmpty().withMessage('cliente requerido'),
  body('telefono').trim().notEmpty().withMessage('telefono requerido')
    .matches(/^[0-9+\s\-]{7,15}$/).withMessage('telefono inválido'),
  handleValidation,
];

const reservationUpdateValidators = [
  param('id').toInt().isInt({ min: 1 }).withMessage('ID invalido'),
  body('disponibilidad').trim().isIn(['Disponible', 'Pendiente', 'Reservado', 'Confirmado']).withMessage('Estado no permitido'),
  body('notas').optional().trim().isLength({ max: 500 }).withMessage('notas demasiado largas'),
  handleValidation,
];

const reservationListValidators = [
  query('businessId').trim().notEmpty().withMessage('businessId requerido como query param'),
  handleValidation,
];

// Deprecation header para todas las rutas legacy
router.use((_req, res, next) => {
  res.set('Deprecation', 'true');
  res.set('Link', '</api/businesses/{id}/reservations>; rel="successor-version"');
  next();
});

// ── GET /api/reservations?businessId=xxx ──────────────────────────────────
// Ruta legacy — requiere businessId como query param.
router.get('/', requireAuth, reservationListValidators, async (req, res) => {
  const bizId = req.query.businessId;
  try {
    const { rows } = await db.query(
      'SELECT * FROM reservations WHERE business_id = $1 ORDER BY franja',
      [bizId]
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ── POST /api/reservations ────────────────────────────────────────────────
router.post('/', reservationCreateValidators, validateReservation, async (req, res) => {
  const { businessId, franja, cliente, telefono, servicio, notas } = req.body ?? {};
  try {
    const { rows: taken } = await db.query(
      `SELECT id FROM reservations WHERE business_id = $1 AND franja = $2 AND disponibilidad != 'Disponible'`,
      [businessId, clean(franja)]
    );
    if (taken.length) return res.status(409).json({ ok: false, message: 'Franja no disponible' });

    const { rows } = await db.query(
      `INSERT INTO reservations (business_id, franja, disponibilidad, cliente, telefono, servicio, notas)
       VALUES ($1,$2,'Reservado',$3,$4,$5,$6) RETURNING *`,
      [businessId, clean(franja), clean(cliente), clean(telefono),
       clean(servicio ?? ''), clean(notas ?? '')]
    );
    syncInBackground(businessId, 'reservations');
    res.status(201).json({ ok: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ── PUT /api/reservations/:id ─────────────────────────────────────────────
router.put('/:id', requireAuth, reservationUpdateValidators, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const { rows: existingRows } = await db.query('SELECT business_id FROM reservations WHERE id = $1', [id]);
    if (!existingRows.length) return res.status(404).json({ ok: false, message: 'Reserva no encontrada' });
    if (!canAccessBusinessId(req, res, existingRows[0].business_id)) return;

    const disponibilidad = clean(req.body?.disponibilidad ?? '');
    const result = await db.query(
      `UPDATE reservations SET disponibilidad = $1, notas = $2, updated_at = now()
       WHERE id = $3 RETURNING *`,
      [disponibilidad, clean(req.body?.notas ?? ''), id]
    );
    if (!result.rows.length) return res.status(404).json({ ok: false, message: 'Reserva no encontrada' });
    syncInBackground(result.rows[0].business_id, 'reservations');
    res.json({ ok: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
