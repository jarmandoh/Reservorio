'use strict';

function createIdempotencyDb() {
  const state = {
    idempotency: new Map(),
    payments: new Map(),
    webhookEvents: new Set(),
    reservations: [],
    bookings: [],
    notifications: [],
  };

  async function query(sql, values = []) {
    const text = sql.replace(/\s+/g, ' ').trim();
    if (/^(BEGIN|COMMIT|ROLLBACK)$/i.test(text)) return { rows: [], rowCount: 0 };

    if (text.startsWith('INSERT INTO idempotency_requests')) {
      const [scope, key, requestHash, ownerToken, leaseSeconds] = values;
      const id = `${scope}\0${key}`;
      if (state.idempotency.has(id)) return { rows: [], rowCount: 0 };
      state.idempotency.set(id, {
        scope, key, request_hash: requestHash, owner_token: ownerToken,
        state: 'processing', lease_until: new Date(Date.now() + leaseSeconds * 1000),
        response_status: null, response_body: null, updated_at: new Date(),
      });
      return { rows: [{ key }], rowCount: 1 };
    }

    if (text.startsWith('SELECT request_hash, state')) {
      const record = state.idempotency.get(`${values[0]}\0${values[1]}`);
      return { rows: record ? [{ ...record }] : [], rowCount: record ? 1 : 0 };
    }

    if (text.startsWith("UPDATE idempotency_requests SET state = 'completed'")) {
      const [scope, key, ownerToken, status, body] = values;
      const record = state.idempotency.get(`${scope}\0${key}`);
      if (!record || record.owner_token !== ownerToken) return { rows: [], rowCount: 0 };
      Object.assign(record, { state: 'completed', response_status: status, response_body: JSON.parse(body) });
      return { rows: [], rowCount: 1 };
    }

    if (text.startsWith('UPDATE idempotency_requests SET owner_token')) {
      const [scope, key, ownerToken, leaseSeconds] = values;
      Object.assign(state.idempotency.get(`${scope}\0${key}`), {
        owner_token: ownerToken, lease_until: new Date(Date.now() + leaseSeconds * 1000),
      });
      return { rows: [], rowCount: 1 };
    }

    if (text.startsWith('UPDATE idempotency_requests SET lease_until')) {
      const [scope, key, ownerToken] = values;
      const record = state.idempotency.get(`${scope}\0${key}`);
      if (record?.owner_token === ownerToken) record.lease_until = new Date(0);
      return { rows: [], rowCount: 1 };
    }

    if (text.startsWith('INSERT INTO payment_webhook_events')) {
      const event = values[0];
      if (state.webhookEvents.has(event)) return { rows: [], rowCount: 0 };
      state.webhookEvents.add(event);
      return { rows: [{ event_id: event }], rowCount: 1 };
    }

    if (text.startsWith('INSERT INTO payments')) {
      const checkout = text.includes("'pending', $8, $9");
      const payment = {
        id: values[0], booking_id: values[1], provider_id: values[2], customer_id: values[3],
        amount: values[4], currency: values[5], method: values[6], status: checkout ? 'pending' : values[7],
        idempotency_scope: values[checkout ? 7 : 8], idempotency_key: values[checkout ? 8 : 9], checkout_session_id: null,
      };
      state.payments.set(payment.id, payment);
      return { rows: [], rowCount: 1 };
    }

    if (text.startsWith('SELECT * FROM payments WHERE idempotency_scope')) {
      const payment = [...state.payments.values()].find(
        row => row.idempotency_scope === values[0] && row.idempotency_key === values[1]
      );
      return { rows: payment ? [{ ...payment }] : [], rowCount: payment ? 1 : 0 };
    }

    if (text === 'SELECT * FROM payments ORDER BY created_at DESC') {
      return { rows: [...state.payments.values()].map(row => ({ ...row })), rowCount: state.payments.size };
    }

    if (text.startsWith("UPDATE payments SET status = 'paid'")) {
      const payment = state.payments.get(values[1]);
      if (!payment || payment.status === 'paid') return { rows: [], rowCount: 0 };
      payment.status = 'paid';
      payment.external_reference = values[0];
      return { rows: [{ ...payment }], rowCount: 1 };
    }

    if (text.startsWith('UPDATE payments SET status = $1')) {
      const payment = state.payments.get(values[1]);
      if (!payment || payment.status === values[0]) return { rows: [], rowCount: 0 };
      payment.status = values[0];
      return { rows: [{ ...payment }], rowCount: 1 };
    }

    if (text.startsWith('SELECT * FROM payments WHERE id =')) {
      const payment = state.payments.get(values[0]);
      return { rows: payment ? [{ ...payment }] : [], rowCount: payment ? 1 : 0 };
    }

    if (text.startsWith('UPDATE payments SET checkout_session_id')) {
      const payment = state.payments.get(values[1]);
      if (payment) payment.checkout_session_id = values[0];
      return { rows: [], rowCount: payment ? 1 : 0 };
    }

    if (text.startsWith('INSERT INTO reservations')) {
      const row = { id: state.reservations.length + 1, business_id: values[0], franja: values[1] };
      state.reservations.push(row);
      return { rows: [{ id: row.id }], rowCount: 1 };
    }
    if (text.startsWith('SELECT id FROM businesses')) return { rows: [{ id: values[0] }], rowCount: 1 };
    if (text.startsWith('INSERT INTO customers')) return { rows: [{ id: values[0] }], rowCount: 1 };
    if (text.startsWith('INSERT INTO bookings')) {
      const row = { id: values[0], provider_id: values[1], customer_id: values[2], slot: values[5], status: 'pending' };
      state.bookings.push(row);
      return { rows: [{ ...row }], rowCount: 1 };
    }
    if (text.startsWith('INSERT INTO notifications')) {
      state.notifications.push(values);
      return { rows: [], rowCount: 1 };
    }
    if (text.startsWith('UPDATE bookings') || text.startsWith('UPDATE reservations')) return { rows: [], rowCount: 1 };
    if (text.startsWith('DELETE FROM')) return { rows: [], rowCount: 0 };
    throw new Error(`SQL inesperado en prueba: ${text}`);
  }

  const client = { query, release: jest.fn() };
  const db = { connect: jest.fn().mockResolvedValue(client), query: jest.fn(query) };
  return { db, state, client };
}

module.exports = { createIdempotencyDb };
