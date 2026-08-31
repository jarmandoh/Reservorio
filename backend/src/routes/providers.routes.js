'use strict';

const express = require('express');
const { requireAdmin, requireOwnerAuth, requireBusinessAuth, requireAdminOrOwner } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validation');
const {
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
} = require('../controllers/provider.controller');

const router = express.Router();

router.get('/', providerValidators.list, handleValidation, listProviders);
router.get('/all', requireAdmin, listAllProviders);
router.get('/owner', requireOwnerAuth, listOwnerProviders);
router.post('/:id/auth', authenticateProvider);
router.post('/', requireAdminOrOwner, providerValidators.create, handleValidation, createProvider);
router.get('/:id', requireBusinessAuth, getProviderById);
router.put('/:id', requireBusinessAuth, providerValidators.update, handleValidation, updateProvider);
router.patch('/:id/toggle', requireAdmin, toggleProvider);
router.delete('/:id', requireAdmin, deleteProvider);
router.get('/:id/reservations', requireBusinessAuth, listProviderReservations);
router.post('/:id/reservations', providerValidators.reservation, handleValidation, createProviderReservation);
router.put('/:id/reservations/:row', requireBusinessAuth, providerValidators.reservation, handleValidation, updateProviderReservation);
router.get('/:id/services', listProviderServices);
router.post('/:id/services', requireBusinessAuth, providerValidators.service, handleValidation, addProviderService);
router.delete('/:id/services/:nombre', requireBusinessAuth, removeProviderService);

module.exports = router;
