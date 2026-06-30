'use strict';

const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/tags/all
router.get('/all', async (_req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM tags ORDER BY name');
    res.status(200).json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
