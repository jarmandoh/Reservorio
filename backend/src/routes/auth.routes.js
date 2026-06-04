'use strict';

const express   = require('express');
const { body }  = require('express-validator');
const { sign }  = require('../middleware/jwt');
const { handleValidation } = require('../middleware/validation');
const router    = express.Router();

const ADMIN_PIN = process.env.ADMIN_PIN || '1234';

/** POST /api/auth/admin */
router.post(
  '/admin',
  body('pin').trim().notEmpty().withMessage('pin requerido'),
  handleValidation,
  (req, res) => {
    const pin = String(req.body.pin);
    if (pin !== ADMIN_PIN) return res.status(401).json({ ok: false, message: 'PIN incorrecto' });
    const token = sign({ role: 'admin' });
    res.json({ ok: true, data: { token } });
  }
);

module.exports = router;
