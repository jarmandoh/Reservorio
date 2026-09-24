'use strict';
const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const { handleValidation } = require('../middleware/validation');
const { requireAuth } = require('../middleware/auth');
const authService = require('../services/auth.service');

const router = express.Router();

// Límite estricto anti-fuerza bruta sobre autenticación (10 intentos / 15 min por IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Demasiados intentos de autenticación, inténtalo más tarde.' },
});

/** POST /api/auth/admin */
router.post(
  '/admin',
  authLimiter,
  body('pin').trim().notEmpty().withMessage('pin requerido'),
  handleValidation,
  async (req, res) => {
    const pin = String(req.body.pin);
    try {
      const result = await authService.authenticateAdmin(pin);
      return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
    } catch (error) {
      console.error('Error en autenticación admin:', error);
      return res.status(500).json({ ok: false, message: 'Server error' });
    }
  }
);

/** POST /api/auth/owner/register */
router.post(
  '/owner/register',
  authLimiter,
  body('name').trim().notEmpty().withMessage('name requerido'),
  body('email').trim().isEmail().withMessage('email inválido'),
  body('password').trim().isLength({ min: 6 }).withMessage('password requiere al menos 6 caracteres'),
  handleValidation,
  async (req, res) => {
    try {
      const result = await authService.registerOwner({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
      });
      return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
    } catch (error) {
      console.error('Error en registro de dueño:', error);
      return res.status(500).json({ ok: false, message: 'Server error' });
    }
  }
);

/** POST /api/auth/owner/login */
router.post(
  '/owner/login',
  authLimiter,
  body('email').trim().isEmail().withMessage('email inválido'),
  body('password').trim().notEmpty().withMessage('password requerido'),
  handleValidation,
  async (req, res) => {
    try {
      const result = await authService.loginOwner({
        email: req.body.email,
        password: req.body.password,
      });
      return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
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
    const result = await authService.getOwnerProfile(req.authPayload.ownerId);
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    console.error('Error owner/me:', error);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

/** POST /api/auth/customer/login */
router.post(
  '/customer/login',
  authLimiter,
  body('email').trim().isEmail().withMessage('email inválido'),
  body('phone').optional({ values: 'falsy' }).trim().isLength({ min: 7, max: 20 }).withMessage('phone inválido (7-20 caracteres)'),
  handleValidation,
  async (req, res) => {
    try {
      const result = await authService.loginCustomer({
        email: req.body.email,
        phone: req.body.phone,
      });
      return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
    } catch (error) {
      console.error('Error en login de cliente:', error);
      return res.status(500).json({ ok: false, message: 'Server error' });
    }
  }
);

module.exports = router;
