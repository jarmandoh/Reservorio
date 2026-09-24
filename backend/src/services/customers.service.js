'use strict';

const { randomUUID } = require('crypto');
const db = require('../db');
const { listBookings } = require('./bookings.service');
const { parsePagination } = require('../utils/pagination');

const fallbackCustomers = [
  { id: 'cliente1', name: 'Ana García', email: 'ana@example.com', phone: '+34123456789' },
  { id: 'cliente2', name: 'Luis Pérez', email: 'luis@example.com', phone: '+34123456790' },
];

async function listCustomers(query = {}) {
  const { page, pageSize, limit, offset, paginated } = parsePagination(query);

  if (!process.env.DATABASE_URL) {
    let data = fallbackCustomers;
    if (paginated) {
      const total = data.length;
      data = data.slice(offset, offset + limit);
      return { ok: true, status: 200, data, meta: { total, page, pageSize } };
    }
    return { ok: true, status: 200, data };
  }

  try {
    let sql = 'SELECT id, name, email, phone, created_at FROM customers ORDER BY created_at DESC';
    const values = [];
    if (paginated) {
      sql += ' LIMIT $1 OFFSET $2';
      values.push(limit, offset);
    }

    const { rows } = await db.query(sql, values);
    const result = { ok: true, status: 200, data: rows };

    if (paginated) {
      const count = await db.query('SELECT COUNT(*)::int AS total FROM customers');
      result.meta = { total: Number(count.rows[0]?.total) || 0, page, pageSize };
    }

    return result;
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

async function findOrCreateCustomer({ name, email, phone } = {}) {
  const cleanName = String(name ?? '').trim();
  const cleanEmail = String(email ?? '').trim().toLowerCase();
  const cleanPhone = String(phone ?? '').trim();

  if (!cleanName || !cleanEmail) {
    return { ok: false, status: 400, message: 'name y email son requeridos' };
  }

  if (!process.env.DATABASE_URL) {
    const existing = fallbackCustomers.find(c => c.email.toLowerCase() === cleanEmail);
    if (existing) {
      return { ok: true, status: 200, data: existing, created: false };
    }
    const customer = { id: `cliente-${Date.now()}`, name: cleanName, email: cleanEmail, phone: cleanPhone };
    fallbackCustomers.push(customer);
    return { ok: true, status: 201, data: customer, created: true };
  }

  try {
    const existing = await db.query('SELECT id, name, email, phone, created_at FROM customers WHERE email = $1', [cleanEmail]);
    if (existing.rows.length) {
      return { ok: true, status: 200, data: existing.rows[0], created: false };
    }

    const id = randomUUID();
    await db.query(
      'INSERT INTO customers (id, name, email, phone) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING',
      [id, cleanName, cleanEmail, cleanPhone]
    );

    const { rows } = await db.query('SELECT id, name, email, phone, created_at FROM customers WHERE email = $1', [cleanEmail]);
    return { ok: true, status: 201, data: rows[0], created: true };
  } catch (error) {
    return { ok: false, status: 500, message: error.message };
  }
}

async function findCustomerByEmail(email) {
  const cleanEmail = String(email ?? '').trim().toLowerCase();
  if (!cleanEmail) {
    return { ok: false, status: 400, message: 'email requerido' };
  }

  if (!process.env.DATABASE_URL) {
    const customer = fallbackCustomers.find(c => c.email.toLowerCase() === cleanEmail);
    return customer
      ? { ok: true, status: 200, data: customer }
      : { ok: false, status: 404, message: 'No hay historial asociado a ese email' };
  }

  try {
    const { rows } = await db.query('SELECT id, name, email, phone, created_at FROM customers WHERE email = $1', [cleanEmail]);
    if (!rows.length) {
      return { ok: false, status: 404, message: 'No hay historial asociado a ese email' };
    }
    return { ok: true, status: 200, data: rows[0] };
  } catch (error) {
    return { ok: false, status: 500, message: error.message };
  }
}

async function getCustomerProfile(customerId) {
  const cleanId = String(customerId ?? '').trim();
  if (!cleanId) {
    return { ok: false, status: 400, message: 'customerId requerido' };
  }

  if (!process.env.DATABASE_URL) {
    const customer = fallbackCustomers.find(c => c.id === cleanId);
    return customer
      ? { ok: true, status: 200, data: customer }
      : { ok: false, status: 404, message: 'Cliente no encontrado' };
  }

  try {
    const { rows } = await db.query(
      'SELECT id, name, email, phone, created_at FROM customers WHERE id = $1',
      [cleanId]
    );
    if (!rows.length) {
      return { ok: false, status: 404, message: 'Cliente no encontrado' };
    }
    return { ok: true, status: 200, data: rows[0] };
  } catch (error) {
    return { ok: false, status: 500, message: error.message };
  }
}

async function getCustomerHistory(customerId, query = {}) {
  const cleanId = String(customerId ?? '').trim();
  const { page, pageSize, limit, offset, paginated } = parsePagination(query);
  if (!cleanId) {
    return { ok: false, status: 400, message: 'customerId requerido' };
  }

  if (!process.env.DATABASE_URL) {
    const customer = fallbackCustomers.find(c => c.id === cleanId);
    if (!customer) {
      return { ok: false, status: 404, message: 'Cliente no encontrado' };
    }
    const bookingsResult = await listBookings();
    const bookingsSource = bookingsResult.ok ? bookingsResult.data : [];
    let bookings = bookingsSource
      .filter(b => b.customerId === cleanId)
      .map(b => ({ ...b, businessName: '' }));
    const total = bookings.length;
    if (paginated) {
      bookings = bookings.slice(offset, offset + limit);
    }
    const result = { ok: true, status: 200, data: { customer, bookings } };
    if (paginated) {
      result.meta = { total, page, pageSize };
    }
    return result;
  }

  try {
    const { rows: customerRows } = await db.query(
      'SELECT id, name, email, phone, created_at FROM customers WHERE id = $1',
      [cleanId]
    );
    if (!customerRows.length) {
      return { ok: false, status: 404, message: 'Cliente no encontrado' };
    }

    let sql = `SELECT b.id, b.provider_id, p.name AS business_name, b.service_id,
               b.booking_date AS date, b.slot, b.status, b.notes, b.created_at
        FROM bookings b
        LEFT JOIN businesses p ON p.id = b.provider_id
        WHERE b.customer_id = $1
        ORDER BY b.created_at DESC`;
    const values = [cleanId];
    if (paginated) {
      sql += ' LIMIT $2 OFFSET $3';
      values.push(limit, offset);
    }

    const { rows } = await db.query(sql, values);

    const bookingIds = rows.map(r => r.id);
    let paymentsByBooking = {};
    if (bookingIds.length) {
      const { rows: paymentRows } = await db.query(
        `SELECT booking_id, amount, currency, method, status
         FROM payments
         WHERE booking_id = ANY($1)
         ORDER BY created_at DESC`,
        [bookingIds]
      );
      paymentsByBooking = paymentRows.reduce((acc, p) => {
        if (!acc[p.booking_id]) acc[p.booking_id] = p;
        return acc;
      }, {});
    }

    const result = {
      ok: true,
      status: 200,
      data: {
        customer: customerRows[0],
        bookings: rows.map(r => {
          const payment = paymentsByBooking[r.id];
          return {
            id: r.id,
            providerId: r.provider_id,
            businessName: r.business_name ?? '',
            serviceId: r.service_id,
            date: r.date,
            slot: r.slot,
            status: r.status,
            notes: r.notes,
            createdAt: r.created_at,
            paymentAmount: payment ? Number(payment.amount) : null,
            paymentCurrency: payment ? payment.currency : null,
            paymentStatus: payment ? payment.status : null,
            paymentMethod: payment ? payment.method : null,
          };
        }),
      },
    };

    if (paginated) {
      const count = await db.query(
        'SELECT COUNT(*)::int AS total FROM bookings WHERE customer_id = $1',
        [cleanId]
      );
      result.meta = { total: Number(count.rows[0]?.total) || 0, page, pageSize };
    }

    return result;
  } catch (error) {
    return { ok: false, status: 500, message: error.message };
  }
}

module.exports = {
  listCustomers,
  createCustomer,
  findOrCreateCustomer,
  findCustomerByEmail,
  getCustomerProfile,
  getCustomerHistory,
};
