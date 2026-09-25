'use strict';

const express = require('express');
const { sseHandler } = require('../services/realtime.service');

const router = express.Router();

// GET /api/realtime/stream?businessId=xxx — SSE, sin auth (filtrado en cliente)
// Si se quiere auth, el cliente puede pasar ?token=... y validar aquí con requireAuth.
router.get('/stream', sseHandler);

// Alias para compatibilidad: GET /api/bookings/stream
router.get('/bookings/stream', sseHandler);

module.exports = router;
