'use strict';

const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const {
  getMarketplaceStats,
  listAllReviews,
  deleteReview,
  listAllServices,
  deleteService,
  listAdminPayments,
} = require('../services/admin.service');

const router = express.Router();

router.use(requireAdmin);

router.get('/stats', async (req, res) => {
  try {
    const result = await getMarketplaceStats();
    return res
      .status(result.status)
      .json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

router.get('/payments', async (req, res) => {
  try {
    const result = await listAdminPayments(req.query);
    return res
      .status(result.status)
      .json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

router.get('/reviews', async (req, res) => {
  try {
    const result = await listAllReviews();
    return res
      .status(result.status)
      .json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

router.delete('/reviews/:id', async (req, res) => {
  try {
    const result = await deleteReview(req.params.id);
    return res
      .status(result.status)
      .json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

router.get('/services', async (req, res) => {
  try {
    const result = await listAllServices();
    return res
      .status(result.status)
      .json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

router.delete('/services/:serviceId', async (req, res) => {
  try {
    const result = await deleteService(req.params.serviceId);
    return res
      .status(result.status)
      .json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

module.exports = router;
