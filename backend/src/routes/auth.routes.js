'use strict';
const express   = require('express');
const { body }  = require('express-validator');
const { sign }  = require('../middleware/jwt');
const { handleValidation } = require('../middleware/validation');
const bcrypt    = require('bcrypt');


const router    = express.Router();

const ADMIN_PIN = process.env.ADMIN_PIN || '1234';

/** POST /api/auth/admin */
router.post(
  '/admin',
  body('pin').trim().notEmpty().withMessage('pin requerido'),
  handleValidation,
  async (req, res) => {
    const pin = String(req.body.pin);
    try {
      const validPin = pin // await bcrypt.compare(pin, ADMIN_PIN);
      if (!validPin) {
        return res.status(401).json({ ok: false, message: 'PIN incorrecto' });
      }
      const token = sign({ role: 'admin'}, '2h' );
      res.json({ ok: true, data: { token } });
    } catch (error) {
      console.error('Error en autenticación admin:', error);
      return res.status(500).json({ ok: false, message: 'Server error' });
    }
  }
);

module.exports = router;
