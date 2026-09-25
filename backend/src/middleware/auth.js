'use strict';

const { verify } = require('./jwt');
const db = require('../db');

function getBearerToken(req) {
  const header = String(req.headers.authorization || '');
  if (!header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ ok: false, message: 'Token requerido' });
  }

  try {
    req.authPayload = verify(token);
    return next();
  } catch (err) {
    return res.status(401).json({ ok: false, message: 'Token invalido o expirado' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.authPayload.role !== 'admin') {
      return res.status(403).json({ ok: false, message: 'Requiere rol admin' });
    }
    next();
  });
}

function requireOwnerAuth(req, res, next) {
  requireAuth(req, res, () => {
    if (req.authPayload.role !== 'owner') {
      return res.status(403).json({ ok: false, message: 'Requiere rol owner' });
    }
    next();
  });
}

function requireCustomer(req, res, next) {
  requireAuth(req, res, () => {
    if (req.authPayload.role !== 'customer' || !req.authPayload.customerId) {
      return res.status(403).json({ ok: false, message: 'Requiere rol cliente' });
    }
    req.customerId = req.authPayload.customerId;
    next();
  });
}

function requireAdminOrOwner(req, res, next) {
  requireAuth(req, res, () => {
    if (req.authPayload.role !== 'admin' && req.authPayload.role !== 'owner') {
      return res.status(403).json({ ok: false, message: 'Requiere rol admin u owner' });
    }
    next();
  });
}

function canAccessBusinessId(req, res, businessId) {
  const payload = req.authPayload;
  if (!payload) {
    res.status(401).json({ ok: false, message: 'Token requerido' });
    return false;
  }

  if (payload.role === 'admin') return true;
  if (payload.role === 'business-admin' && String(payload.businessId) === String(businessId)) return true;

  res.status(403).json({ ok: false, message: 'Sin acceso a este negocio' });
  return false;
}

async function canAccessBusiness(req, res) {
  const payload = req.authPayload;
  if (!payload) {
    res.status(401).json({ ok: false, message: 'Token requerido' });
    return false;
  }

  if (payload.role === 'admin') return true;
  if (payload.role === 'business-admin' && payload.businessId === req.params.id) return true;

  if (payload.role === 'owner') {
    try {
      const { rows } = await db.query('SELECT 1 FROM business_owners WHERE business_id = $1 AND owner_id = $2', [
        req.params.id,
        payload.ownerId,
      ]);
      if (rows.length) return true;
    } catch (e) {
      res.status(500).json({ ok: false, message: e.message });
      return false;
    }
  }

  res.status(403).json({ ok: false, message: 'Sin acceso a este negocio' });
  return false;
}

async function requireBusinessAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ ok: false, message: 'Token requerido' });
  }

  try {
    req.authPayload = verify(token);
  } catch (err) {
    return res.status(401).json({ ok: false, message: 'Token invalido o expirado' });
  }

  if (!(await canAccessBusiness(req, res))) return;
  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireOwnerAuth,
  requireCustomer,
  requireAdminOrOwner,
  requireBusinessAuth,
  canAccessBusiness,
  canAccessBusinessId,
  getBearerToken,
};
