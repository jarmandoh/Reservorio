'use strict';

const { randomUUID } = require('crypto');
const db = require('../db');

const fallbackCustomers = [
  { id: 'cliente1', name: 'Ana García', email: 'ana@example.com', phone: '+34123456789' },
  { id: 'cliente2', name: 'Luis Pérez', email: 'luis@example.com', phone: '+34123456790' },
];

async function listCustomers() {
  if (!process.env.DATABASE_URL) {
    return { ok: true, status: 200, data: fallbackCustomers };
  }

  try {
    const { rows } = await db.query('SELECT id, name, email, phone, created_at FROM customers ORDER BY created_at DESC');
    return { ok: true, status: 200, data: rows };
  } catch (error) {
    return { ok: false, status: 500, message: error.message };
  }
}

async function createCustomer(payload = {}) {
  const name = String(payload.name ?? '').trim();
  const email = String(payload.email ?? '').trim().toLowerCase();
  const phone = String(payload.phone ?? '').trim();

  if (!name || !email) {
    return { ok: false, status: 400, message: 'name y email son requeridos' };
  }

  if (!process.env.DATABASE_URL) {
    const customer = {
      id: `cliente-${Date.now()}`,
      name,
      email,
      phone,
    };
    fallbackCustomers.push(customer);
    return { ok: true, status: 201, data: customer };
  }

  try {
    const existing = await db.query('SELECT id FROM customers WHERE email = $1', [email]);
    if (existing.rows.length) {
      return { ok: false, status: 409, message: 'Cliente ya existe' };
    }

    const id = randomUUID();
    const { rows } = await db.query(
      'INSERT INTO customers (id, name, email, phone) VALUES ($1, $2, $3, $4) RETURNING id, name, email, phone, created_at',
      [id, name, email, phone]
    );

    return { ok: true, status: 201, data: rows[0] };
  } catch (error) {
    return { ok: false, status: 500, message: error.message };
  }
}

module.exports = { listCustomers, createCustomer };
