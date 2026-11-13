'use strict';

const express = require('express');
const { param } = require('express-validator');
const { handleValidation } = require('../middleware/validation');
const db = require('../db');

const router = express.Router();

const categoryIdValidator = [param('id').isInt({ min: 1 }).withMessage('ID de categoría inválido'), handleValidation];

// ── GET /api/categories/all ────────────────────────────────────────────────
router.get('/all', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, slug, parent_id, sort_order
         FROM categories
        WHERE is_active = true AND parent_id IS NULL
        ORDER BY sort_order, name`
    );
    res.status(200).json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

router.get('/tree', async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, slug, parent_id, sort_order
         FROM categories
        WHERE is_active = true
        ORDER BY sort_order, name`
    );
    const categories = rows.map(row => ({ ...row, children: [] }));
    const byId = new Map(categories.map(category => [category.id, category]));
    const tree = [];
    for (const category of categories) {
      const parent = category.parent_id == null ? null : byId.get(category.parent_id);
      if (parent) parent.children.push(category);
      else if (category.parent_id == null) tree.push(category);
    }
    res.status(200).json({ ok: true, data: tree });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ── GET /api/categories/:id ────────────────────────────────────────────────
router.get('/:id', categoryIdValidator, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query(
      `SELECT id, name, slug, parent_id, sort_order
         FROM categories
        WHERE id = $1 AND is_active = true`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ ok: false, message: 'Categoría no encontrada' });
    res.status(200).json({ ok: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
