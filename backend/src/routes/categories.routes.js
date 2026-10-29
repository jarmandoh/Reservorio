'use strict';

const express   = require('express');
const { body }  = require('express-validator');
const { sign }  = require('../middleware/jwt');
const { handleValidation } = require('../middleware/validation');
const db        = require('../db');
const router    = express.Router();

// ── GET /api/categories ────────────────────────────────────────────────
// Retorna todas las categorías disponibles para filtrar
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, name FROM categories ORDER BY name ASC');
    const categories = rows.map(r => r.name);
    res.status(200).json({ ok: true, data: categories });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ── GET /api/categories/:id ────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
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