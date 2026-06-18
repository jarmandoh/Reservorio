'use strict';

const express   = require('express');
const { body }  = require('express-validator');
const { sign }  = require('../middleware/jwt');
const { handleValidation } = require('../middleware/validation');
const db = require('../db');

const router    = express.Router();

// ── GET /api/categories/all ────────────────────────────────────────────────
router.get(
  '/categories/all',
  async (req, res) => {
    console.log('GET ------ /api/categories');
    // const { businessId, franja, cliente, telefono, servicio, notas } = req.body ?? {};
    try {
      const { rows } = await db.query('SELECT * FROM categories');
      res.status(200).json({ ok: true, data: rows });
    } catch (err) {
      res.status(500).json({ ok: false, message: err.message });
    }
  }
);

// ── GET /api/categories/:id ────────────────────────────────────────────────
router.get(
  '/categories/:id',
  async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query('SELECT * FROM categories WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ ok: false, message: 'Categoría no encontrada' });
    res.status(200).json({ ok: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});


module.exports = router;