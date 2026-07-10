'use strict';
const express = require('express');
const { body } = require('express-validator');
const { randomUUID } = require('crypto');
const bcrypt = require('bcrypt');
const { sign } = require('../middleware/jwt');
const { handleValidation } = require('../middleware/validation');
const { requireAuth } = require('../middleware/auth');
const db = require('../db');

const router = express.Router();

const ADMIN_PIN = process.env.ADMIN_PIN || '1234';

/** POST /api/auth/admin */
router.post(
  '/admin',
  body('pin').trim().notEmpty().withMessage('pin requerido'),
  handleValidation,
  async (req, res) => {
    const pin = String(req.body.pin);
    try {
      if (pin !== ADMIN_PIN) {
        return res.status(401).json({ ok: false, message: 'PIN incorrecto' });
      }
      const token = sign({ role: 'admin' }, '2h');
      res.json({ ok: true, data: { token } });
    } catch (error) {
      console.error('Error en autenticación admin:', error);
      return res.status(500).json({ ok: false, message: 'Server error' });
    }
  }
);

/** POST /api/auth/owner/register */
router.post(
  '/owner/register',
  body('name').trim().notEmpty().withMessage('name requerido'),
  body('email').trim().isEmail().withMessage('email inválido'),
  body('password').trim().isLength({ min: 6 }).withMessage('password requiere al menos 6 caracteres'),
  handleValidation,
  async (req, res) => {
    const name = String(req.body.name).trim();
    const email = String(req.body.email).trim().toLowerCase();
    const password = String(req.body.password);

    try {
      const { rows: existing } = await db.query('SELECT id FROM owners WHERE email = $1', [email]);
      if (existing.length) {
        return res.status(409).json({ ok: false, message: 'Ya existe un dueño con ese correo' });
      }

      const ownerId = randomUUID();
      const passwordHash = await bcrypt.hash(password, 10);
      await db.query(
        'INSERT INTO owners (id, name, email, password_hash) VALUES ($1, $2, $3, $4)',
        [ownerId, name, email, passwordHash]
      );

      const token = sign({ role: 'owner', ownerId }, '8h');
      res.status(201).json({ ok: true, data: { token, owner: { id: ownerId, name, email } } });
    } catch (error) {
      console.error('Error en registro de dueño:', error);
      return res.status(500).json({ ok: false, message: 'Server error' });
    }
  }
);

/** POST /api/auth/owner/login */
router.post(
  '/owner/login',
  body('email').trim().isEmail().withMessage('email inválido'),
  body('password').trim().notEmpty().withMessage('password requerido'),
  handleValidation,
  async (req, res) => {
    const email = String(req.body.email).trim().toLowerCase();
    const password = String(req.body.password);

    try {
      const { rows } = await db.query('SELECT * FROM owners WHERE email = $1', [email]);
      if (!rows.length) {
        return res.status(401).json({ ok: false, message: 'Credenciales inválidas' });
      }

      const owner = rows[0];
      const valid = await bcrypt.compare(password, owner.password_hash);
      if (!valid) {
        return res.status(401).json({ ok: false, message: 'Credenciales inválidas' });
      }

      const token = sign({ role: 'owner', ownerId: owner.id }, '8h');
      res.json({ ok: true, data: { token, owner: { id: owner.id, name: owner.name, email: owner.email } } });
    } catch (error) {
      console.error('Error en login de dueño:', error);
      return res.status(500).json({ ok: false, message: 'Server error' });
    }
  }
);

/** GET /api/auth/owner/me */
router.get('/owner/me', requireAuth, async (req, res) => {
  if (req.authPayload.role !== 'owner') {
    return res.status(403).json({ ok: false, message: 'Requiere rol owner' });
  }

  try {
    const { rows } = await db.query('SELECT id, name, email, created_at FROM owners WHERE id = $1', [req.authPayload.ownerId]);
    if (!rows.length) {
      return res.status(404).json({ ok: false, message: 'Dueño no encontrado' });
    }
    res.json({ ok: true, data: rows[0] });
  } catch (error) {
    console.error('Error owner/me:', error);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

module.exports = router;
