'use strict';

const { randomUUID } = require('crypto');
const bcrypt = require('bcrypt');
const { sign, verify } = require('../middleware/jwt');
const db = require('../db');

const ADMIN_PIN = process.env.ADMIN_PIN || '1234';

// Hash bcrypt del PIN de administración. Se usa ADMIN_PIN_HASH si está definido
// (mezcla de sal aleatoria en el entorno); en caso contrario, se deriva de ADMIN_PIN
// una sola vez en memoria. Esto evita comparar el PIN en texto plano.
let adminHashPromise = null;
function getAdminHash() {
  if (!adminHashPromise) {
    const configured = String(process.env.ADMIN_PIN_HASH || '').trim();
    adminHashPromise = configured
      ? Promise.resolve(configured)
      : bcrypt.hash(String(ADMIN_PIN), 10);
  }
  return adminHashPromise;
}

async function authenticateAdmin(pin) {
  const hash = await getAdminHash();
  const matches = await bcrypt.compare(String(pin), hash);
  if (!matches) {
    return { ok: false, status: 401, message: 'PIN incorrecto' };
  }

  const token = sign({ role: 'admin' }, '2h');
  return { ok: true, status: 200, data: { token } };
}

async function registerOwner({ name, email, password }) {
  const normalizedName = String(name).trim();
  const normalizedEmail = String(email).trim().toLowerCase();
  const passwordValue = String(password);

  const { rows: existing } = await db.query('SELECT id FROM owners WHERE email = $1', [normalizedEmail]);
  if (existing.length) {
    return { ok: false, status: 409, message: 'Ya existe un dueño con ese correo' };
  }

  const ownerId = randomUUID();
  const passwordHash = await bcrypt.hash(passwordValue, 10);
  await db.query('INSERT INTO owners (id, name, email, password_hash) VALUES ($1, $2, $3, $4)', [ownerId, normalizedName, normalizedEmail, passwordHash]);

  const token = sign({ role: 'owner', ownerId }, '8h');
  return {
    ok: true,
    status: 201,
    data: { token, owner: { id: ownerId, name: normalizedName, email: normalizedEmail } },
  };
}

async function loginOwner({ email, password }) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const passwordValue = String(password);

  const { rows } = await db.query('SELECT * FROM owners WHERE email = $1', [normalizedEmail]);
  if (!rows.length) {
    return { ok: false, status: 401, message: 'Credenciales inválidas' };
  }

  const owner = rows[0];
  const valid = await bcrypt.compare(passwordValue, owner.password_hash);
  if (!valid) {
    return { ok: false, status: 401, message: 'Credenciales inválidas' };
  }

  const token = sign({ role: 'owner', ownerId: owner.id }, '8h');
  return {
    ok: true,
    status: 200,
    data: { token, owner: { id: owner.id, name: owner.name, email: owner.email } },
  };
}

async function getOwnerProfile(ownerId) {
  const { rows } = await db.query('SELECT id, name, email, created_at FROM owners WHERE id = $1', [ownerId]);
  if (!rows.length) {
    return { ok: false, status: 404, message: 'Dueño no encontrado' };
  }
  return { ok: true, status: 200, data: rows[0] };
}

function digitsOnly(value) {
  return String(value ?? '').replace(/\D/g, '');
}

/**
 * Login del cliente sin contraseña: se valida contra el email + teléfono
 * con el que se registró en el checkout (único identificador verificado sin
 * infraestructura de email/SMS). Emite JWT con rol customer.
 */
async function loginCustomer({ email, phone } = {}) {
  const cleanEmail = String(email ?? '').trim().toLowerCase();
  if (!cleanEmail) {
    return { ok: false, status: 400, message: 'email requerido' };
  }

  const { rows } = await db.query(
    'SELECT id, name, email, phone FROM customers WHERE email = $1',
    [cleanEmail]
  );
  if (!rows.length) {
    return { ok: false, status: 401, message: 'No encontramos un cliente con ese email y teléfono' };
  }

  const customer = rows[0];
  const storedPhone = digitsOnly(customer.phone);

  // Si el cliente dejó teléfono al registrarse, exige que coincida.
  if (storedPhone && digitsOnly(phone) !== storedPhone) {
    return { ok: false, status: 401, message: 'No encontramos un cliente con ese email y teléfono' };
  }

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
 * Reemite un token de acceso sin pedir credenciales de nuevo.
 *
 * Estrategia de "deslizamiento": se admite un token ya expirado siempre que haya
 * expirado dentro de la ventana REFRESH_GRACE (en horas, defecto 6). Se valida la
 * firma (HS256) y se re-firma el mismo rol/identidad con expiración completa.
 * Esto evita cortar sesiones activas sin introducir almacenamiento de refresh tokens.
 */
async function refreshAccessToken(tokenValue) {
  let payload;
  try {
    payload = verify(String(tokenValue).trim(), { ignoreExpiration: true });
  } catch {
    return { ok: false, status: 401, message: 'Token inválido' };
  }

  const allowedRoles = ['admin', 'owner', 'business-admin', 'customer'];
  if (!allowedRoles.includes(payload.role)) {
    return { ok: false, status: 401, message: 'Token inválido' };
  }

  const graceMs = (Number(process.env.REFRESH_GRACE) || 6) * 60 * 60 * 1000;
  const expMs = Number(payload.exp ?? 0) * 1000;
  if (!expMs || Date.now() > expMs + graceMs) {
    return { ok: false, status: 401, message: 'Sesión expirada; vuelve a iniciar sesión' };
  }

  const freshPayload = { role: payload.role };
  if (payload.role === 'owner') freshPayload.ownerId = payload.ownerId;
  if (payload.role === 'business-admin') freshPayload.businessId = payload.businessId;
  if (payload.role === 'customer') freshPayload.customerId = payload.customerId;

  const expiresIn = payload.role === 'admin' ? '2h' : '8h';
  const token = sign(freshPayload, expiresIn);

  return { ok: true, status: 200, data: { token } };
}

module.exports = {
  authenticateAdmin,
  registerOwner,
  loginOwner,
  loginCustomer,
  getOwnerProfile,
  refreshAccessToken,
};
