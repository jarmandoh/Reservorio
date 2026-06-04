'use strict';

const { verify } = require('./jwt');

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

function canAccessBusiness(req, res) {
  const payload = req.authPayload;
  if (!payload) {
    res.status(401).json({ ok: false, message: 'Token requerido' });
    return false;
  }

  if (payload.role === 'admin') return true;
  if (payload.role === 'business-admin' && payload.businessId === req.params.id) return true;

  res.status(403).json({ ok: false, message: 'Sin acceso a este negocio' });
  return false;
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

function requireBusinessAuth(req, res, next) {
  requireAuth(req, res, () => {
    if (!canAccessBusiness(req, res)) return;
    next();
  });
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireBusinessAuth,
  canAccessBusiness,
  canAccessBusinessId,
  getBearerToken,
};
