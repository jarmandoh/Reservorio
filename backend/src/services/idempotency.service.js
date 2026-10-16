'use strict';

const { createHash, randomUUID } = require('crypto');
const db = require('../db');

const LEASE_SECONDS = 120;

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
  }
  return value;
}

function requestHash(payload) {
  return createHash('sha256').update(JSON.stringify(canonicalize(payload))).digest('hex');
}

async function claim(scope, key, payload) {
  const cleanKey = String(key ?? '').trim();
  if (!/^[\x21-\x7e]{1,128}$/.test(cleanKey)) {
    return { result: { ok: false, status: 400, message: 'Cabecera Idempotency-Key requerida (1–128 caracteres)' } };
  }

  const hash = requestHash(payload);
  const ownerToken = randomUUID();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const inserted = await client.query(
      `INSERT INTO idempotency_requests (scope, key, request_hash, owner_token, lease_until)
       VALUES ($1, $2, $3, $4, now() + ($5 * interval '1 second'))
       ON CONFLICT (scope, key) DO NOTHING
       RETURNING key`,
      [scope, cleanKey, hash, ownerToken, LEASE_SECONDS]
    );

    if (inserted.rows.length) {
      await client.query('COMMIT');
      return { claim: { scope, key: cleanKey, ownerToken } };
    }

    const { rows } = await client.query(
      'SELECT request_hash, state, lease_until, response_status, response_body FROM idempotency_requests WHERE scope = $1 AND key = $2 FOR UPDATE',
      [scope, cleanKey]
    );
    const existing = rows[0];
    if (existing.request_hash !== hash) {
      await client.query('ROLLBACK');
      return { result: { ok: false, status: 409, message: 'Idempotency-Key ya se usó con datos diferentes' } };
    }
    if (existing.state === 'completed') {
      await client.query('COMMIT');
      return { result: existing.response_body, replayed: true, status: existing.response_status };
    }
    if (new Date(existing.lease_until).getTime() > Date.now()) {
      await client.query('ROLLBACK');
      return {
        result: { ok: false, status: 409, message: 'La solicitud con esta clave sigue en proceso; reintenta en unos segundos' },
        inProgress: true,
      };
    }

    await client.query(
      `UPDATE idempotency_requests
       SET owner_token = $3, lease_until = now() + ($4 * interval '1 second'), updated_at = now()
       WHERE scope = $1 AND key = $2`,
      [scope, cleanKey, ownerToken, LEASE_SECONDS]
    );
    await client.query('COMMIT');
    return { claim: { scope, key: cleanKey, ownerToken } };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    throw error;
  } finally {
    client.release();
  }
}

async function complete(client, claimInfo, result) {
  const { rowCount } = await client.query(
    `UPDATE idempotency_requests
     SET state = 'completed', response_status = $4, response_body = $5::jsonb,
         lease_until = now(), updated_at = now()
     WHERE scope = $1 AND key = $2 AND owner_token = $3 AND state = 'processing'`,
    [claimInfo.scope, claimInfo.key, claimInfo.ownerToken, result.status, JSON.stringify(result)]
  );
  if (rowCount !== 1) throw new Error('La reserva de idempotencia expiró antes de completar la operación');
}

async function release(claimInfo) {
  if (!claimInfo) return;
  try {
    await db.query(
      `UPDATE idempotency_requests SET lease_until = now(), updated_at = now()
       WHERE scope = $1 AND key = $2 AND owner_token = $3 AND state = 'processing'`,
      [claimInfo.scope, claimInfo.key, claimInfo.ownerToken]
    );
  } catch {}
}

module.exports = { claim, complete, release };
