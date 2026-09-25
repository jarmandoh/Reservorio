'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, param } = require('express-validator');
const { clean } = require('../middleware/sanitize');
const {
  requireAdmin,
  requireAdminOrOwner,
  requireOwnerAuth,
  requireBusinessAuth,
  requireCustomer,
  requireAuth,
} = require('../middleware/auth');
const { handleValidation } = require('../middleware/validation');
const businessesService = require('../services/businesses.service');
const checkoutService = require('../services/checkout.service');

const router = express.Router();

// Límite estricto anti-fuerza bruta sobre el login por PIN (10 intentos / 15 min por IP)
const pinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Demasiados intentos de PIN, inténtalo más tarde.' },
});

const businessCreateValidators = [
  body('name').trim().notEmpty().withMessage('name requerido'),
  body('category').trim().notEmpty().withMessage('category requerido'),
  body('pin').trim().notEmpty().withMessage('pin requerido'),
  body('rating').optional().isFloat({ min: 0, max: 5 }).withMessage('rating inválido'),
  body('reviews').optional().isInt({ min: 0 }).withMessage('reviews inválido'),
  body('cancellationPolicy').optional().trim().isLength({ max: 500 }).withMessage('cancellationPolicy demasiado larga'),
  handleValidation,
];

const businessUpdateValidators = [
  param('id').trim().notEmpty().withMessage('id requerido'),
  body('rating').optional().isFloat({ min: 0, max: 5 }).withMessage('rating inválido'),
  body('reviews').optional().isInt({ min: 0 }).withMessage('reviews inválido'),
  body('pin').optional().trim().notEmpty().withMessage('pin requerido'),
  body('cancellationPolicy').optional().trim().isLength({ max: 500 }).withMessage('cancellationPolicy demasiado larga'),
  handleValidation,
];

const reservationValidators = [
  body('franja').trim().notEmpty().withMessage('franja requerido'),
  body('cliente').trim().notEmpty().withMessage('cliente requerido'),
  body('telefono')
    .trim()
    .notEmpty()
    .withMessage('telefono requerido')
    .matches(/^[0-9+\s\-]{7,15}$/)
    .withMessage('telefono inválido'),
  body('servicio').optional().trim().isLength({ max: 100 }).withMessage('servicio demasiado largo'),
  body('notas').optional().trim().isLength({ max: 500 }).withMessage('notas demasiado largas'),
  handleValidation,
];

const reservationUpdateValidators = [
  param('row').toInt().isInt({ min: 1 }).withMessage('ID de reserva invalido'),
  body('disponibilidad')
    .trim()
    .isIn(['Disponible', 'Pendiente', 'Reservado', 'Confirmado', 'Cancelado'])
    .withMessage('Estado no permitido'),
  body('notas').optional().trim().isLength({ max: 500 }).withMessage('notas demasiado largas'),
  handleValidation,
];

const serviceValidators = [
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('nombre requerido')
    .isLength({ max: 100 })
    .withMessage('nombre demasiado largo'),
  handleValidation,
];

const serviceNameParamValidator = [param('nombre').trim().notEmpty().withMessage('nombre requerido'), handleValidation];

const checkoutValidators = [
  body('franja').trim().notEmpty().withMessage('franja requerido'),
  body('cliente').trim().notEmpty().withMessage('cliente requerido'),
  body('telefono')
    .trim()
    .notEmpty()
    .withMessage('telefono requerido')
    .matches(/^[0-9+\s\-]{7,15}$/)
    .withMessage('telefono inválido'),
  body('servicio').optional().trim().isLength({ max: 100 }).withMessage('servicio demasiado largo'),
  body('notas').optional().trim().isLength({ max: 500 }).withMessage('notas demasiado largas'),
  body('email').optional().trim().isEmail().withMessage('email inválido'),
  handleValidation,
];

// GET /api/businesses  -> activos, publico, con filtros de busqueda y etiquetas. Soporta paginación ?page=&pageSize=
router.get('/', async (req, res) => {
  try {
    const result = await businessesService.listBusinesses(req.query);
    res.status(result.status).json({
      ok: result.ok,
      ...(result.ok
        ? { data: result.data, ...(result.meta ? { meta: result.meta } : {}) }
        : { message: result.message }),
    });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// GET /api/businesses/all  -> todos (solo admin)
router.get('/all', requireAdmin, async (_req, res) => {
  try {
    const result = await businessesService.listAllBusinesses();
    res
      .status(result.status)
      .json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// GET /api/businesses/owner -> negocios del dueño autenticado
router.get('/owner', requireOwnerAuth, async (req, res) => {
  try {
    const result = await businessesService.listOwnerBusinesses(req.authPayload.ownerId);
    res
      .status(result.status)
      .json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// POST /api/businesses/:id/auth  -> login con PIN del negocio
router.post('/:id/auth', pinLimiter, async (req, res) => {
  const pin = String(req.body?.pin ?? '');
  if (!pin) return res.status(400).json({ ok: false, message: 'pin requerido' });

  try {
    const result = await businessesService.authenticateBusiness(req.params.id, pin);
    return res
      .status(result.status)
      .json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// POST /api/businesses  -> crear negocio (admin o dueño)
router.post('/', requireAdminOrOwner, businessCreateValidators, async (req, res) => {
  const ownerId = req.authPayload?.role === 'owner' ? req.authPayload.ownerId : null;
  const body = { ...req.body };
  if (req.authPayload?.role !== 'admin') {
    delete body.rating;
    delete body.reviews;
  }
  try {
    const result = await businessesService.createBusiness(body, ownerId);
    res
      .status(result.status)
      .json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// PUT /api/businesses/:id  -> actualizar (admin o propio business-admin)
router.put('/:id', requireBusinessAuth, businessUpdateValidators, async (req, res) => {
  const body = { ...req.body };
  if (req.authPayload?.role !== 'admin') {
    delete body.rating;
    delete body.reviews;
  }
  try {
    const result = await businessesService.updateBusiness(req.params.id, body);
    res
      .status(result.status)
      .json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// PATCH /api/businesses/:id/toggle  -> activar/desactivar (solo admin)
router.patch('/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const result = await businessesService.toggleBusiness(req.params.id);
    res
      .status(result.status)
      .json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// PATCH /api/businesses/:id/verify  -> marcar/desmarcar verificado (solo admin)
router.patch('/:id/verify', requireAdmin, async (req, res) => {
  try {
    const result = await businessesService.setBusinessVerified(req.params.id, req.body?.verified);
    res
      .status(result.status)
      .json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// DELETE /api/businesses/:id  -> eliminar negocio (solo admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const result = await businessesService.deleteBusiness(req.params.id);
    res
      .status(result.status)
      .json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// ── Per-business reservations ─────────────────────────────────────────────

// GET /api/businesses/:id/availability  -> público, solo franjas/estado (sin datos personales)
router.get('/:id/availability', async (req, res) => {
  try {
    const result = await businessesService.listAvailability(req.params.id);
    res
      .status(result.status)
      .json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// GET /api/businesses/:id
router.get('/:id', requireBusinessAuth, async (req, res) => {
  try {
    const result = await businessesService.getBusinessById(req.params.id);
    res
      .status(result.status)
      .json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// GET /api/businesses/:id/reservations — paginable con ?page=&pageSize=
router.get('/:id/reservations', requireBusinessAuth, async (req, res) => {
  try {
    const result = await businessesService.listReservations(req.params.id, req.query);
    res.status(result.status).json({
      ok: result.ok,
      ...(result.ok
        ? { data: result.data, ...(result.meta ? { meta: result.meta } : {}) }
        : { message: result.message }),
    });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// POST /api/businesses/:id/reservations — requiere cliente registrado (o admin/business para setup de slots)
router.post(`/:id/reservations`, requireAuth, reservationValidators, async (req, res) => {
  try {
    const isCustomer = req.authPayload.role === 'customer';
    if (!isCustomer && !['admin', 'business-admin', 'owner'].includes(req.authPayload.role)) {
      return res.status(403).json({ ok: false, message: 'Requiere rol cliente o negocio' });
    }
    // Solo clientes necesitan estar registrados; admin/business pueden crear slots de prueba
    const body = isCustomer ? { ...req.body, _customerId: req.authPayload.customerId } : req.body;
    const result = await businessesService.createReservation(req.params.id, body);
    res
      .status(result.status)
      .json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// POST /api/businesses/:id/checkout  -> requiere cliente registrado; reserva + customer + booking reales
router.post('/:id/checkout', requireCustomer, checkoutValidators, async (req, res) => {
  try {
    const payload = { ...req.body, _customerId: req.customerId, _customerEmail: req.authPayload?.email };
    const result = await checkoutService.checkoutForBusiness(req.params.id, payload);
    res
      .status(result.status)
      .json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// PUT /api/businesses/:id/reservations/:row
router.put('/:id/reservations/:row', requireBusinessAuth, reservationUpdateValidators, async (req, res) => {
  const reservaId = parseInt(req.params.row, 10);
  try {
    const result = await businessesService.updateReservation(req.params.id, reservaId, req.body);
    res
      .status(result.status)
      .json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// ── Per-business services ─────────────────────────────────────────────────

// GET /api/businesses/:id/services
router.get('/:id/services', async (req, res) => {
  try {
    const result = await businessesService.listServices(req.params.id);
    res
      .status(result.status)
      .json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// POST /api/businesses/:id/services
router.post('/:id/services', requireBusinessAuth, serviceValidators, async (req, res) => {
  try {
    const result = await businessesService.addService(req.params.id, req.body?.nombre);
    res
      .status(result.status)
      .json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ ok: false, message: 'Servicio ya existe' });
    res.status(500).json({ ok: false, message: e.message });
  }
});

// DELETE /api/businesses/:id/services/:nombre
router.delete('/:id/services/:nombre', requireBusinessAuth, serviceNameParamValidator, async (req, res) => {
  try {
    const result = await businessesService.removeService(req.params.id, req.params.nombre);
    res
      .status(result.status)
      .json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
