'use strict';

const db = require('../db');

const baseUrl = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

function isConfigured() {
  return Boolean(baseUrl && serviceKey);
}

async function getSupabaseUser(accessToken) {
  if (!isConfigured() || !accessToken) return null;

  const response = await fetch(`${baseUrl}/auth/v1/user`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) return null;
  return response.json();
}

async function resolveAuthPayload(accessToken) {
  const user = await getSupabaseUser(accessToken);
  if (!user?.id || !user.email) return null;

  const email = String(user.email).trim().toLowerCase();
  const owner = await db.query('SELECT id FROM owners WHERE email = $1', [email]);
  if (owner.rows[0]) {
    return { role: 'owner', ownerId: owner.rows[0].id, supabaseUserId: user.id };
  }

  const customer = await db.query('SELECT id FROM customers WHERE email = $1', [email]);
  if (customer.rows[0]) {
    return { role: 'customer', customerId: customer.rows[0].id, supabaseUserId: user.id };
  }

  return { role: 'customer', supabaseUserId: user.id, email };
}

module.exports = { isConfigured, getSupabaseUser, resolveAuthPayload };
