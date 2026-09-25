'use strict';

/**
 * Autenticación de clientes por OTP / magic-link.
 *
 * Sin contraseña: el código de 6 dígitos o el enlace solo llegan a la misma
 * cuenta (email teléfono) que el cliente registró en el checkout, por lo que
 * sirven como factor de acceso cuando hay infraestructura de email/SMS.
 *
 * Los códigos y tokens se almacenan con hash SHA-256 (jamás en claro), con
 * expiración corta y límite de intentos; al verificarse se consumen (one-time).
 */

const crypto = require('crypto');
const { randomUUID } = require('crypto');
const { sign } = require('../middleware/jwt');
const channels = require('./channels');
const db = require('../db');
const logger = require('../logger');

const OTP_TTL_MS = 10 * 60 * 1000; // 10 min
const MAGIC_TTL_MS = 15 * 60 * 1000; // 15 min
const MAX_ATTEMPTS = 5;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';
const otpDebug = () => process.env.OTP_DEBUG === '1';

// Backoff simple por email para solicitudes OTP/magic-link (anti-spam)
// Mantiene respuesta genérica para evitar enumeración
const OTP_BACKOFF_MAX = Number(process.env.OTP_MAX_REQUESTS) || 5;
const OTP_BACKOFF_WINDOW_MS = (Number(process.env.OTP_WINDOW_MIN) || 5) * 60 * 1000;
const emailOtpRequests = new Map();
function cleanEmailOtpStore() {
  const now = Date.now();
  for (const [k, v] of emailOtpRequests) {
    if (v.expiresAt <= now) emailOtpRequests.delete(k);
  }
}
function isEmailOtpRateLimited(email) {
  if (!email) return false;
  cleanEmailOtpStore();
  const entry = emailOtpRequests.get(email);
  if (!entry) return false;
  if (entry.count >= OTP_BACKOFF_MAX && entry.expiresAt > Date.now()) return true;
  return false;
}
function recordEmailOtpRequest(email) {
  if (!email) return;
  cleanEmailOtpStore();
  const now = Date.now();
  const entry = emailOtpRequests.get(email);
  if (!entry || entry.expiresAt <= now) {
    emailOtpRequests.set(email, { count: 1, expiresAt: now + OTP_BACKOFF_WINDOW_MS });
    return;
  }
  entry.count += 1;
  emailOtpRequests.set(email, entry);
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function digitsOnly(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function cleanEmail(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function generateOtp() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

function generateMagicToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function isExpired(row) {
  return !row.expires_at || new Date(row.expires_at).getTime() <= Date.now();
}

async function findCustomerByEmail(email) {
  const { rows } = await db.query('SELECT id, name, email, phone FROM customers WHERE email = $1', [email]);
  return rows[0] || null;
}

async function findCode(codeHash, kind) {
  const { rows } = await db.query(
    'SELECT id, customer_id, kind, code_hash, attempts, expires_at FROM customer_login_codes WHERE code_hash = $1',
    [codeHash]
  );
  const row = rows.find(r => r.kind === kind) || null;
  return row;
}

async function saveCode(customerId, kind, value, expiresAt) {
  await db.query('DELETE FROM customer_login_codes WHERE customer_id = $1', [customerId]);
  await db.query(
    `INSERT INTO customer_login_codes (id, customer_id, kind, code_hash, attempts, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [randomUUID(), customerId, kind, sha256(value), 0, expiresAt]
  );
}

function issueCustomerToken(customer) {
  const token = sign({ role: 'customer', customerId: customer.id }, '8h');
  return {
    ok: true,
    status: 200,
    data: {
      token,
      customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone ?? '' },
    },
  };
}

/**
 * Solicita un OTP por email (y por SMS si el cliente dejó teléfono).
 * Respuesta genérica para no revelar qué emails existen.
 */
async function requestOtp({ email } = {}) {
  const clean = cleanEmail(email);
  if (!clean) return { ok: false, status: 400, message: 'email requerido' };

  try {
    if (isEmailOtpRateLimited(clean)) {
      // Respuesta genérica para evitar enumeración
      return {
        ok: true,
        status: 200,
        data: { message: 'Si el correo está registrado, recibirás un código de acceso.' },
      };
    }
    const customer = await findCustomerByEmail(clean);
    if (!customer) {
      recordEmailOtpRequest(clean);
      return {
        ok: true,
        status: 200,
        data: { message: 'Si el correo está registrado, recibirás un código de acceso.' },
      };
    }

    recordEmailOtpRequest(clean);
    const code = generateOtp();
    await saveCode(customer.id, 'otp', `${clean}:${code}`, new Date(Date.now() + OTP_TTL_MS));

    const emailResult = await channels.sendEmail({
      to: customer.email,
      subject: 'Tu código de acceso a Reservorio',
      textBody: `Hola ${customer.name},\n\nTu código para acceder a tu historial de reservas es:\n\n  ${code}\n\nCaduca en 10 minutos. Si no la has solicitado, ignora este mensaje.`,
    });

    let smsResult = null;
    if (customer.phone && digitsOnly(customer.phone)) {
      smsResult = await channels.sendSms({
        to: customer.phone,
        message: `Reservorio: tu codigo de acceso es ${code}. Caduca en 10 min.`,
      });
    }

    return {
      ok: true,
      status: 200,
      data: {
        message: 'Si el correo está registrado, recibirás un código de acceso.',
        ...(otpDebug() ? { debugCode: code } : {}),
        delivery: {
          email: emailResult?.ok ? 'sent' : 'failed',
          sms: smsResult ? (smsResult.ok ? 'sent' : 'failed') : 'skipped',
        },
      },
    };
  } catch (error) {
    logger.error('[customer-auth] requestOtp falló:', error.message);
    return { ok: false, status: 500, message: error.message };
  }
}

/** Verifica el OTP y emite JWT de cliente (one-time). */
async function verifyOtp({ email, code } = {}) {
  const clean = cleanEmail(email);
  const cleanCode = String(code ?? '').trim();
  if (!clean || !cleanCode) return { ok: false, status: 400, message: 'email y code requeridos' };

  try {
    const customer = await findCustomerByEmail(clean);
    const record = customer ? await findCode(sha256(`${clean}:${cleanCode}`), 'otp') : null;

    if (!customer || !record) {
      return { ok: false, status: 401, message: 'Código inválido o expirado' };
    }

    if (isExpired(record)) {
      await db.query('DELETE FROM customer_login_codes WHERE id = $1', [record.id]);
      return { ok: false, status: 401, message: 'El código ha caducado. Solicita uno nuevo.' };
    }

    const expected = Buffer.from(record.code_hash, 'hex');
    const received = Buffer.from(sha256(`${clean}:${cleanCode}`), 'hex');
    const matches = expected.length === received.length && crypto.timingSafeEqual(expected, received);

    if (!matches) {
      const attemptsLeft = MAX_ATTEMPTS - (Number(record.attempts) + 1);
      if (attemptsLeft <= 0) {
        await db.query('DELETE FROM customer_login_codes WHERE id = $1', [record.id]);
        return { ok: false, status: 401, message: 'Demasiados intentos. Solicita un nuevo código.' };
      }
      await db.query('UPDATE customer_login_codes SET attempts = $1 WHERE id = $2', [
        Number(record.attempts) + 1,
        record.id,
      ]);
      return { ok: false, status: 401, message: 'Código inválido o expirado' };
    }

    await db.query('DELETE FROM customer_login_codes WHERE id = $1', [record.id]);
    return issueCustomerToken(customer);
  } catch (error) {
    logger.error('[customer-auth] verifyOtp falló:', error.message);
    return { ok: false, status: 500, message: error.message };
  }
}

/** Solicita un magic-link por email. Respuesta genérica (sin enumeración). */
async function requestMagicLink({ email } = {}) {
  const clean = cleanEmail(email);
  if (!clean) return { ok: false, status: 400, message: 'email requerido' };

  try {
    if (isEmailOtpRateLimited(clean)) {
      return {
        ok: true,
        status: 200,
        data: { message: 'Si el correo está registrado, recibirás un enlace de acceso.' },
      };
    }
    const customer = await findCustomerByEmail(clean);
    if (!customer) {
      recordEmailOtpRequest(clean);
      return {
        ok: true,
        status: 200,
        data: { message: 'Si el correo está registrado, recibirás un enlace de acceso.' },
      };
    }

    recordEmailOtpRequest(clean);
    const token = generateMagicToken();
    await saveCode(customer.id, 'magic_link', token, new Date(Date.now() + MAGIC_TTL_MS));

    const link = `${FRONTEND_URL}/customer/verify?token=${encodeURIComponent(token)}`;
    const emailResult = await channels.sendEmail({
      to: customer.email,
      subject: 'Accede a tu historial en Reservorio',
      textBody: `Hola ${customer.name},\n\nAccede a tu historial de reservas con este enlace (válido 15 minutos):\n\n  ${link}\n\nSi no lo has solicitado, ignora este mensaje.`,
    });

    return {
      ok: true,
      status: 200,
      data: {
        message: 'Si el correo está registrado, recibirás un enlace de acceso.',
        ...(otpDebug() ? { debugToken: token } : {}),
        delivery: { email: emailResult?.ok ? 'sent' : 'failed' },
      },
    };
  } catch (error) {
    logger.error('[customer-auth] requestMagicLink falló:', error.message);
    return { ok: false, status: 500, message: error.message };
  }
}

/** Canjea el magic-link y emite JWT de cliente (one-time). */
async function verifyMagicLink({ token } = {}) {
  const cleanToken = String(token ?? '').trim();
  if (!cleanToken) return { ok: false, status: 400, message: 'token requerido' };

  try {
    const record = await findCode(sha256(cleanToken), 'magic_link');
    if (!record) {
      return { ok: false, status: 401, message: 'Enlace inválido o ya utilizado' };
    }

    if (isExpired(record)) {
      await db.query('DELETE FROM customer_login_codes WHERE id = $1', [record.id]);
      return { ok: false, status: 401, message: 'El enlace ha caducado. Solicita uno nuevo.' };
    }

    const { rows } = await db.query('SELECT id, name, email, phone FROM customers WHERE id = $1', [record.customer_id]);
    if (!rows.length) {
      await db.query('DELETE FROM customer_login_codes WHERE id = $1', [record.id]);
      return { ok: false, status: 401, message: 'Enlace inválido o ya utilizado' };
    }

    await db.query('DELETE FROM customer_login_codes WHERE id = $1', [record.id]);
    return issueCustomerToken(rows[0]);
  } catch (error) {
    logger.error('[customer-auth] verifyMagicLink falló:', error.message);
    return { ok: false, status: 500, message: error.message };
  }
}

module.exports = { requestOtp, verifyOtp, requestMagicLink, verifyMagicLink, MAX_ATTEMPTS, OTP_TTL_MS, MAGIC_TTL_MS };
