'use strict';

const { randomUUID } = require('crypto');
const bcrypt = require('bcrypt');
const { sign } = require('../middleware/jwt');
const db = require('../db');

const ADMIN_PIN = process.env.ADMIN_PIN || '1234';

async function authenticateAdmin(pin) {
  if (String(pin) !== ADMIN_PIN) {
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

module.exports = {
  authenticateAdmin,
  registerOwner,
  loginOwner,
  loginCustomer,
  getOwnerProfile,
};
