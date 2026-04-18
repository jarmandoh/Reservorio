'use strict';

const express = require('express');
const { clean } = require('../middleware/sanitize');
const db = require('../db');
const { syncInBackground } = require('../services/syncService');

const router = express.Router();

// Deprecation header para todas las rutas legacy
router.use((_req, res, next) => {
  res.set('Deprecation', 'true');
  res.set('Link', '</api/businesses/{id}/services>; rel="successor-version"');
  next();
});

// GET /api/services?businessId=xxx
router.get('/', async (req, res) => {
  const bizId = req.query.businessId;
  if (!bizId) return res.status(400).json({ ok: false, message: 'businessId requerido como query param' });
  try {
    const { rows } = await db.query(
      'SELECT nombre FROM services WHERE business_id = $1 ORDER BY nombre',
      [bizId]
    );
    res.json({ ok: true, data: rows.map(r => r.nombre) });
  } catch (err) {
    res.status(502).json({ ok: false, message: err.message });
  }
});

// POST /api/services
router.post('/', async (req, res) => {
  const nombre   = clean(req.body?.nombre ?? '');
  const businessId = req.body?.businessId;
  if (!nombre)             return res.status(400).json({ ok: false, message: 'nombre requerido' });
  if (nombre.length > 100) return res.status(400).json({ ok: false, message: 'nombre demasiado largo' });
  if (!businessId)         return res.status(400).json({ ok: false, message: 'businessId requerido' });

  try {
    await db.query('INSERT INTO services (business_id, nombre) VALUES ($1, $2)', [businessId, nombre]);
    syncInBackground(businessId, 'services');
    res.status(201).json({ ok: true, data: { nombre } });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ ok: false, message: 'Servicio ya existe' });
    res.status(500).json({ ok: false, message: err.message });
  }
});

// DELETE /api/services/:nombre?businessId=xxx
router.delete('/:nombre', async (req, res) => {
  const nombre     = clean(decodeURIComponent(req.params.nombre ?? ''));
  const businessId = req.query.businessId;
  if (!nombre)     return res.status(400).json({ ok: false, message: 'nombre requerido' });
  if (!businessId) return res.status(400).json({ ok: false, message: 'businessId requerido como query param' });

  try {
    const result = await db.query(
      'DELETE FROM services WHERE business_id = $1 AND nombre = $2',
      [businessId, nombre]
    );
    if (!result.rowCount) return res.status(404).json({ ok: false, message: 'Servicio no encontrado' });
    syncInBackground(businessId, 'services');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
