'use strict';
// Auditoría estructurada (SOC 2 / ISO 27001 / ISO 27701).
// Registra eventos de seguridad sin exponer PII (emails/tokens enmascarados).

const logger = require('../logger');

const SENSITIVE_KEYS = new Set(['password', 'password_hash', 'pin', 'pin_hash', 'token', 'access_token', 'refresh_token', 'secret', 'authorization']);

function redact(value, depth = 0) {
  if (depth > 4 || value == null) return value;
  if (Array.isArray(value)) return value.map(v => redact(v, depth + 1));
  if (typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) {
      if (SENSITIVE_KEYS.has(String(k).toLowerCase())) out[k] = '[REDACTED]';
      else out[k] = redact(value[k], depth + 1);
    }
    return out;
  }
  return value;
}

function maskEmail(email) {
  if (typeof email !== 'string' || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  const masked = local.length <= 2 ? '*'.repeat(local.length) : local[0] + '*'.repeat(local.length - 2) + local.slice(-1);
  return `${masked}@${domain}`;
}

function audit(event, meta = {}) {
  const payload = redact({ ...meta });
  if (payload.email) payload.email = maskEmail(payload.email);
  if (payload.actor) payload.actor = maskEmail(payload.actor);
  logger.info(`[AUDIT] ${event}`, payload);
}

module.exports = { audit, redact, maskEmail };
