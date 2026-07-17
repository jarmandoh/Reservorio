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

module.exports = {
  authenticateAdmin,
  registerOwner,
  loginOwner,
  getOwnerProfile,
};
