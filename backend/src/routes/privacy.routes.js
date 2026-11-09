'use strict';
const express = require('express');
const { requireAuth, requireCustomer, requireOwnerAuth } = require('../middleware/auth');
const db = require('../db');
const { audit } = require('../middleware/audit');
const logger = require('../logger');

const router = express.Router();

// GET /api/privacy/export — exporta los datos personales del sujeto (DSAR, ISO 27701 / GDPR art. 15/20)
router.get('/export', requireAuth, async (req, res) => {
  try {
    const payload = req.authPayload;
    const out = { role: payload.role, exportedAt: new Date().toISOString() };

    if (payload.role === 'customer' && payload.customerId) {
      const { rows: cust } = await db.query('SELECT id, name, email, phone, created_at FROM customers WHERE id = $1', [
        payload.customerId,
      ]);
      const { rows: resv } = await db.query(
        'SELECT id, business_id, franja, servicio, created_at FROM reservations WHERE telefono = (SELECT phone FROM customers WHERE id = $1) OR cliente = (SELECT name FROM customers WHERE id = $1)',
        [payload.customerId]
      );
      out.customer = cust[0] || null;
      out.reservations = resv;
    } else if (payload.role === 'owner' && payload.ownerId) {
      const { rows: owner } = await db.query('SELECT id, name, email, created_at FROM owners WHERE id = $1', [
        payload.ownerId,
      ]);
      const { rows: links } = await db.query('SELECT business_id FROM business_owners WHERE owner_id = $1', [
        payload.ownerId,
      ]);
      out.owner = owner[0] || null;
      out.businesses = links.map(l => l.business_id);
    } else {
      out.message = 'Rol no soportado para exportación automática.';
    }

    audit('privacy.export', { role: payload.role, ip: req.ip });
    return res.json({ ok: true, data: out });
  } catch (error) {
    logger.error('Error en privacy/export:', error);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// DELETE /api/privacy/account — derecho de supresión (ISO 27701 / GDPR art. 17)
router.delete('/account', requireAuth, async (req, res) => {
  try {
    const payload = req.authPayload;
    if (payload.role === 'customer' && payload.customerId) {
      await db.query('DELETE FROM customers WHERE id = $1', [payload.customerId]);
      audit('privacy.delete', { role: 'customer', id: payload.customerId, ip: req.ip });
      return res.json({ ok: true, message: 'Cuenta y datos eliminados.' });
    }
    if (payload.role === 'owner' && payload.ownerId) {
      // Anonimizar (no borrar negocios para no romper reservas históricas)
      await db.query(
        "UPDATE owners SET name = 'deleted', email = CONCAT('deleted-', id, '@deleted.local'), password_hash = '' WHERE id = $1",
        [payload.ownerId]
      );
      audit('privacy.delete', { role: 'owner', id: payload.ownerId, ip: req.ip });
      return res.json({ ok: true, message: 'Cuenta anonimizada.' });
    }
    return res.status(400).json({ ok: false, message: 'Rol no soportado.' });
  } catch (error) {
    logger.error('Error en privacy/account:', error);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

module.exports = router;
