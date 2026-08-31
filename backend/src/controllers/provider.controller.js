'use strict';

const { body, param, query } = require('express-validator');
const businessesService = require('../services/businesses.service');

async function listProviders(req, res) {
  try {
    const result = await businessesService.listBusinesses(req.query);
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
}

async function listAllProviders(req, res) {
  try {
    const result = await businessesService.listAllBusinesses();
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
}

async function listOwnerProviders(req, res) {
  try {
    const result = await businessesService.listOwnerBusinesses(req.authPayload.ownerId);
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
}

async function authenticateProvider(req, res) {
  const pin = String(req.body?.pin ?? '');
  if (!pin) return res.status(400).json({ ok: false, message: 'pin requerido' });

  try {
    const result = await businessesService.authenticateBusiness(req.params.id, pin);
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
}

async function createProvider(req, res) {
  const ownerId = req.authPayload?.role === 'owner' ? req.authPayload.ownerId : null;
  try {
    const result = await businessesService.createBusiness(req.body, ownerId);
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
}

async function getProviderById(req, res) {
  try {
    const result = await businessesService.getBusinessById(req.params.id);
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
}

async function updateProvider(req, res) {
  try {
    const result = await businessesService.updateBusiness(req.params.id, req.body);
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
}

async function toggleProvider(req, res) {
  try {
    const result = await businessesService.toggleBusiness(req.params.id);
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
}

async function deleteProvider(req, res) {
  try {
    const result = await businessesService.deleteBusiness(req.params.id);
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
}

async function listProviderReservations(req, res) {
  try {
    const result = await businessesService.listReservations(req.params.id);
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
}

async function createProviderReservation(req, res) {
  try {
    const result = await businessesService.createReservation(req.params.id, req.body);
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
}

async function updateProviderReservation(req, res) {
  try {
    const result = await businessesService.updateReservation(req.params.id, Number(req.params.row), req.body);
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
}

async function listProviderServices(req, res) {
  try {
    const result = await businessesService.listServices(req.params.id);
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
}

async function addProviderService(req, res) {
  try {
    const result = await businessesService.addService(req.params.id, req.body?.nombre);
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ ok: false, message: 'Servicio ya existe' });
    return res.status(500).json({ ok: false, message: error.message });
  }
}

async function removeProviderService(req, res) {
  try {
    const result = await businessesService.removeService(req.params.id, req.params.nombre);
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
}

const providerValidators = {
  list: [
    query('q').optional().trim(),
    query('category').optional().trim(),
    query('location').optional().trim(),
    query('tags').optional().trim(),
  ],
  create: [
    body('name').trim().notEmpty().withMessage('name requerido'),
    body('category').trim().notEmpty().withMessage('category requerido'),
    body('pin').trim().notEmpty().withMessage('pin requerido'),
    body('rating').optional().isFloat({ min: 0, max: 5 }).withMessage('rating inválido'),
    body('reviews').optional().isInt({ min: 0 }).withMessage('reviews inválido'),
  ],
  update: [
    param('id').trim().notEmpty().withMessage('id requerido'),
    body('rating').optional().isFloat({ min: 0, max: 5 }).withMessage('rating inválido'),
    body('reviews').optional().isInt({ min: 0 }).withMessage('reviews inválido'),
    body('pin').optional().trim().notEmpty().withMessage('pin requerido'),
  ],
  reservation: [
    body('franja').trim().notEmpty().withMessage('franja requerido'),
    body('cliente').trim().notEmpty().withMessage('cliente requerido'),
    body('telefono').trim().notEmpty().withMessage('telefono requerido').matches(/^[0-9+\s\-]{7,15}$/).withMessage('telefono inválido'),
  ],
  service: [
    body('nombre').trim().notEmpty().withMessage('nombre requerido').isLength({ max: 100 }).withMessage('nombre demasiado largo'),
  ],
};

module.exports = {
  listProviders,
  listAllProviders,
  listOwnerProviders,
  authenticateProvider,
  createProvider,
  getProviderById,
  updateProvider,
  toggleProvider,
  deleteProvider,
  listProviderReservations,
  createProviderReservation,
  updateProviderReservation,
  listProviderServices,
  addProviderService,
  removeProviderService,
  providerValidators,
};
