'use strict';
const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const { handleValidation } = require('../middleware/validation');
const { requireAuth } = require('../middleware/auth');
const authService = require('../services/auth.service');
const customerAuthService = require('../services/customer-auth.service');
const logger = require('../logger');

const router = express.Router();

function makeLimiter(max) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, message: 'Demasiados intentos de autenticación, inténtalo más tarde.' },
  });
}

// Límite estricto anti-fuerza bruta sobre autenticación (10 intentos / 15 min por IP)
const authLimiter = makeLimiter(10);
// Los endpoints OTP/magic-link tienen su propio contador (solicitar + verificar)
const otpLimiter = makeLimiter(30);
// El refresh de sesión tiene un límite generoso (renovaciones periódicas legítimas).
const refreshLimiter = makeLimiter(60);

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
      logger.error('Error en autenticación admin:', error);
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
      logger.error('Error en registro de dueño:', error);
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
      logger.error('Error en login de dueño:', error);
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
    logger.error('Error owner/me:', error);
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
      logger.error('Error en login de cliente:', error);
      return res.status(500).json({ ok: false, message: 'Server error' });
    }
  }
);

/** POST /api/auth/customer/otp/request � solicita un OTP por email/SMS */
router.post(
  '/customer/otp/request',
  otpLimiter,
  body('email').trim().isEmail().withMessage('email inválido'),
  handleValidation,
  async (req, res) => {
    try {
      const result = await customerAuthService.requestOtp({ email: req.body.email });
      return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
    } catch (error) {
      logger.error('Error en solicitud de OTP:', error);
      return res.status(500).json({ ok: false, message: 'Server error' });
    }
  }
);

/** POST /api/auth/customer/otp/verify � canjea el OTP por un JWT de cliente */
router.post(
  '/customer/otp/verify',
  otpLimiter,
  body('email').trim().isEmail().withMessage('email inválido'),
  body('code').trim().matches(/^\d{4,8}$/).withMessage('code inválido (4-8 dígitos)'),
  handleValidation,
  async (req, res) => {
    try {
      const result = await customerAuthService.verifyOtp({ email: req.body.email, code: req.body.code });
      return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
    } catch (error) {
      logger.error('Error en verificación de OTP:', error);
      return res.status(500).json({ ok: false, message: 'Server error' });
    }
  }
);

/** POST /api/auth/customer/magic-link/request � solicita un enlace de acceso por email */
router.post(
  '/customer/magic-link/request',
  otpLimiter,
  body('email').trim().isEmail().withMessage('email inválido'),
  handleValidation,
  async (req, res) => {
    try {
      const result = await customerAuthService.requestMagicLink({ email: req.body.email });
      return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
    } catch (error) {
      logger.error('Error en solicitud de magic-link:', error);
      return res.status(500).json({ ok: false, message: 'Server error' });
    }
  }
);

/** POST /api/auth/customer/magic-link/verify � canjea el enlace por un JWT de cliente */
router.post(
  '/customer/magic-link/verify',
  otpLimiter,
  body('token').trim().isLength({ min: 16, max: 256 }).withMessage('token inválido'),
  handleValidation,
  async (req, res) => {
    try {
      const result = await customerAuthService.verifyMagicLink({ token: req.body.token });
      return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
    } catch (error) {
      logger.error('Error en verificación de magic-link:', error);
      return res.status(500).json({ ok: false, message: 'Server error' });
    }
  }
);

/** POST /api/auth/refresh � reemite un token de sesión dentro de la ventana de gracia */
router.post(
  '/refresh',
  refreshLimiter,
  body('token').trim().notEmpty().withMessage('token requerido'),
  handleValidation,
  async (req, res) => {
    try {
      const result = await authService.refreshAccessToken(req.body.token);
      return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
    } catch (error) {
      logger.error('Error en refresh de token:', error);
      return res.status(500).json({ ok: false, message: 'Server error' });
    }
  }
);

module.exports = router;

