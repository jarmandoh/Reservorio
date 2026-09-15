'use strict';

const express = require('express');
const { body } = require('express-validator');
const { handleValidation } = require('../middleware/validation');
const { listReviews, getAverageRating, createReview } = require('../services/ratings.service');

const router = express.Router();

router.get('/:businessId', async (req, res) => {
  try {
    const result = await listReviews(req.params.businessId);
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

router.get('/:businessId/average', async (req, res) => {
  try {
    const result = await getAverageRating(req.params.businessId);
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

router.post('/:businessId', [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('rating debe estar entre 1 y 5'),
  body('review').optional().trim().isLength({ max: 500 }).withMessage('review no puede exceder 500 caracteres'),
  handleValidation,
], async (req, res) => {
  try {
    const result = await createReview(req.params.businessId, req.body.rating, req.body.review);
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

module.exports = router;
