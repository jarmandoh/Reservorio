'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const logger = require('../logger');
const { sseHandler } = require('../services/realtime.service');

const router = express.Router();

async function authorizeBusinessStream(req, res) {
  const businessId = String(req.query.businessId ?? '').trim();
  if (!businessId) {
    return res.status(400).json({ ok: false, message: 'businessId requerido' });
  }

  const payload = req.authPayload;
  if (payload.role === 'admin' || (payload.role === 'business-admin' && payload.businessId === businessId)) {
    req.businessId = businessId;
    return sseHandler(req, res);
  }

  if (payload.role === 'owner') {
    try {
      const { rows } = await db.query('SELECT 1 FROM business_owners WHERE business_id = $1 AND owner_id = $2', [
        businessId,
        payload.ownerId,
      ]);
      if (rows.length) {
        req.businessId = businessId;
        return sseHandler(req, res);
      }
    } catch (error) {
      logger.error('[realtime] no se pudo comprobar el acceso al negocio:', error.message);
      return res.status(500).json({ ok: false, message: 'No se pudo validar el acceso al negocio' });
    }
  }

  return res.status(403).json({ ok: false, message: 'Sin acceso a este negocio' });
}

router.get('/stream', requireAuth, authorizeBusinessStream);

// Alias para compatibilidad: GET /api/bookings/stream
router.get('/bookings/stream', requireAuth, authorizeBusinessStream);

module.exports = router;
