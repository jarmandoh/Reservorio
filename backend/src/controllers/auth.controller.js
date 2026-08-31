'use strict';

const { body } = require('express-validator');
const authService = require('../services/auth.service');

async function authenticateAdmin(req, res) {
  const pin = String(req.body.pin ?? '');

  try {
    const result = await authService.authenticateAdmin(pin);
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    console.error('Error en autenticación admin:', error);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
}

async function registerOwner(req, res) {
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

async function loginOwner(req, res) {
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

async function getOwnerProfile(req, res) {
  if (req.authPayload.role !== 'owner') {
    return res.status(403).json({ ok: false, message: 'Requiere rol owner' });
  }

  try {
    const result = await authService.getOwnerProfile(req.authPayload.ownerId);
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    console.error('Error owner/me:', error);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
}

const authValidators = {
  admin: [
    body('pin').trim().notEmpty().withMessage('pin requerido'),
  ],
  registerOwner: [
    body('name').trim().notEmpty().withMessage('name requerido'),
    body('email').trim().isEmail().withMessage('email inválido'),
    body('password').trim().isLength({ min: 6 }).withMessage('password requiere al menos 6 caracteres'),
  ],
  loginOwner: [
    body('email').trim().isEmail().withMessage('email inválido'),
    body('password').trim().notEmpty().withMessage('password requerido'),
  ],
};

module.exports = {
  authenticateAdmin,
  registerOwner,
  loginOwner,
  getOwnerProfile,
  authValidators,
};
