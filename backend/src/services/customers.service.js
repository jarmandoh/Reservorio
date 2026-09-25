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
  const email = String(payload.email ?? '')
    .trim()
    .toLowerCase();
  const phone = String(payload.phone ?? '').trim();
  const dataConsent = payload.dataConsent === true;
  const marketingConsent = payload.marketingConsent === true;

  if (!name || !email) {
    return { ok: false, status: 400, message: 'name y email son requeridos' };
  }

  if (!dataConsent) {
    return { ok: false, status: 400, message: 'Debes aceptar la política de privacidad (dataConsent)' };
  }

  if (!process.env.DATABASE_URL) {
    const customer = {
      id: `cliente-${Date.now()}`,
      name,
      email,
      phone,
      dataConsent: true,
      consentAt: new Date().toISOString(),
      marketingConsent,
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
      `INSERT INTO customers (id, name, email, phone, data_consent, consent_at, marketing_consent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, email, phone, created_at`,
      [id, name, email, phone, true, new Date(), marketingConsent]
    );

    return { ok: true, status: 201, data: rows[0] };
  } catch (error) {
    return { ok: false, status: 500, message: error.message };
  }
}

async function findOrCreateCustomer({ name, email, phone, dataConsent, marketingConsent } = {}) {
  const cleanName = String(name ?? '').trim();
  const cleanEmail = String(email ?? '')
    .trim()
    .toLowerCase();
  const cleanPhone = String(phone ?? '').trim();
  const hasConsent = dataConsent === true;

  if (!cleanName || !cleanEmail) {
    return { ok: false, status: 400, message: 'name y email son requeridos' };
  }

  if (!process.env.DATABASE_URL) {
    const existing = fallbackCustomers.find(c => c.email.toLowerCase() === cleanEmail);
    if (existing) {
      if (hasConsent && !existing.dataConsent) {
        existing.dataConsent = true;
        existing.consentAt = new Date().toISOString();
      }
      return { ok: true, status: 200, data: existing, created: false };
    }
    const customer = {
      id: `cliente-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      dataConsent: hasConsent,
      consentAt: hasConsent ? new Date().toISOString() : null,
      marketingConsent: marketingConsent === true,
    };
    fallbackCustomers.push(customer);
    return { ok: true, status: 201, data: customer, created: true };
  }

  try {
    const existing = await db.query(
      'SELECT id, name, email, phone, data_consent, created_at FROM customers WHERE email = $1',
      [cleanEmail]
    );
    if (existing.rows.length) {
      // Consentimiento renovado (RGPD): guardamos la aceptación si aún no consta.
      if (hasConsent && existing.rows[0].data_consent !== true) {
        await db.query(`UPDATE customers SET data_consent = true, consent_at = now() WHERE id = $1`, [
          existing.rows[0].id,
        ]);
      }
      return { ok: true, status: 200, data: existing.rows[0], created: false };
    }

    const id = randomUUID();
    await db.query(
      `INSERT INTO customers (id, name, email, phone, data_consent, consent_at, marketing_consent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO NOTHING`,
      [id, cleanName, cleanEmail, cleanPhone, hasConsent, hasConsent ? new Date() : null, marketingConsent === true]
    );

    const { rows } = await db.query('SELECT id, name, email, phone, created_at FROM customers WHERE email = $1', [
      cleanEmail,
    ]);
    return { ok: true, status: 201, data: rows[0], created: true };
  } catch (error) {
    return { ok: false, status: 500, message: error.message };
  }
}

async function findCustomerByEmail(email) {
  const cleanEmail = String(email ?? '')
    .trim()
    .toLowerCase();
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
    const { rows } = await db.query('SELECT id, name, email, phone, created_at FROM customers WHERE email = $1', [
      cleanEmail,
    ]);
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
    const { rows } = await db.query('SELECT id, name, email, phone, created_at FROM customers WHERE id = $1', [
      cleanId,
    ]);
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
    let bookings = bookingsSource.filter(b => b.customerId === cleanId).map(b => ({ ...b, businessName: '' }));
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
      const count = await db.query('SELECT COUNT(*)::int AS total FROM bookings WHERE customer_id = $1', [cleanId]);
      result.meta = { total: Number(count.rows[0]?.total) || 0, page, pageSize };
    }

    return result;
  } catch (error) {
    return { ok: false, status: 500, message: error.message };
  }
}

/**
 * Export RGPD: todos los datos personales del cliente (perfil + bookings +
 * pagos + notificaciones). Descargable por el propio cliente.
 */
async function exportCustomerData(customerId) {
  const cleanId = String(customerId ?? '').trim();
  if (!cleanId) {
    return { ok: false, status: 400, message: 'customerId requerido' };
  }

  if (!process.env.DATABASE_URL) {
    const customer = fallbackCustomers.find(c => c.id === cleanId);
    if (!customer) {
      return { ok: false, status: 404, message: 'Cliente no encontrado' };
    }
    return { ok: true, status: 200, data: { customer, bookings: [], payments: [], notifications: [] } };
  }

  try {
    const { rows: customerRows } = await db.query(
      'SELECT id, name, email, phone, created_at, data_consent, consent_at, marketing_consent FROM customers WHERE id = $1',
      [cleanId]
    );
    if (!customerRows.length) {
      return { ok: false, status: 404, message: 'Cliente no encontrado' };
    }

    const { rows: bookings } = await db.query(
      `SELECT b.id, b.provider_id, b.service_id, b.booking_date, b.slot, b.status, b.notes, b.created_at
       FROM bookings b WHERE b.customer_id = $1 ORDER BY b.created_at DESC`,
      [cleanId]
    );

    const { rows: payments } = await db.query(
      `SELECT id, booking_id, provider_id, amount, currency, method, status, external_reference, created_at
       FROM payments WHERE customer_id = $1 ORDER BY created_at DESC`,
      [cleanId]
    );

    const { rows: notifications } = await db.query(
      `SELECT id, business_id, booking_id, type, channel, title, message, status, created_at
       FROM notifications WHERE customer_id = $1 ORDER BY created_at DESC`,
      [cleanId]
    );

    return {
      ok: true,
      status: 200,
      data: {
        exportedAt: new Date().toISOString(),
        customer: customerRows[0],
        bookings,
        payments,
        notifications,
      },
    };
  } catch (error) {
    return { ok: false, status: 500, message: error.message };
  }
}

/**
 * Derecho al olvido (borrado): anonimiza el registro en lugar de borrarlo para
 * no destruir el historial financiero ni romper las referencias de pagos.
 * El email se vuelve irrecuperable y el cliente pierde acceso (login por email).
 * Los códigos de acceso pendientes se invalidan.
 */
async function deleteCustomer(customerId) {
  const cleanId = String(customerId ?? '').trim();
  if (!cleanId) {
    return { ok: false, status: 400, message: 'customerId requerido' };
  }

  if (!process.env.DATABASE_URL) {
    const idx = fallbackCustomers.findIndex(c => c.id === cleanId);
    if (idx === -1) {
      return { ok: false, status: 404, message: 'Cliente no encontrado' };
    }
    fallbackCustomers[idx] = {
      id: cleanId,
      name: 'Cliente eliminado',
      email: `anon-${cleanId}@eliminado.local`,
      phone: '',
      dataConsent: false,
    };
    return { ok: true, status: 200, data: { id: cleanId, anonymized: true } };
  }

  try {
    const { rows } = await db.query(
      `UPDATE customers
       SET name = 'Cliente eliminado',
           email = 'anon-' || id || '@eliminado.local',
           phone = '',
           sms_opt_in = false,
           data_consent = false,
           marketing_consent = false,
           consent_at = NULL
       WHERE id = $1
       RETURNING id`,
      [cleanId]
    );
    if (!rows.length) {
      return { ok: false, status: 404, message: 'Cliente no encontrado' };
    }

    await db.query('DELETE FROM customer_login_codes WHERE customer_id = $1', [cleanId]);

    return { ok: true, status: 200, data: { id: rows[0].id, anonymized: true } };
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
  exportCustomerData,
  deleteCustomer,
};
