'use strict';

const { randomUUID } = require('crypto');
const db = require('../db');
const { runWithRlsContext } = require('../db-context');

const baseUrl = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const publishableKey = String(process.env.SUPABASE_PUBLISHABLE_KEY || '').trim();

function isConfigured() {
  return Boolean(baseUrl && publishableKey);
}

/**
 * Valida el access token directamente contra Supabase Auth.
 * La publishable key identifica el proyecto; el JWT del usuario autentica la petición.
 */
async function getSupabaseUser(accessToken) {
  if (!isConfigured() || !accessToken) return null;

  const response = await fetch(`${baseUrl}/auth/v1/user`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) return null;
  return response.json();
}

/**
 * Resuelve el JWT de Supabase a los IDs internos que consume el backend.
 * Los roles privilegiados solo se aceptan desde app_metadata (gestionada en servidor),
 * nunca desde user_metadata, que el propio usuario puede editar.
 */
async function resolveAuthPayload(accessToken) {
  const user = await getSupabaseUser(accessToken);
  if (!user?.id || !user.email) return null;

  const email = String(user.email).trim().toLowerCase();
  const appRole = String(user.app_metadata?.role || '').toLowerCase();

  if (appRole === 'admin') {
    return { role: 'admin', supabaseUserId: user.id };
  }

  return runWithRlsContext({ role: 'auth' }, async () => {
    const owner = await db.query('SELECT id FROM owners WHERE email = $1', [email]);
    if (owner.rows[0]) {
      return { role: 'owner', ownerId: owner.rows[0].id, supabaseUserId: user.id };
    }

    // El cliente puede autenticarse por password, Google, OTP o magic-link.
    // Si su identidad de Auth es nueva, se crea su perfil interno de cliente.
    const displayName = String(user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0])
      .trim()
      .slice(0, 160);
    const customer = await db.query(
      `INSERT INTO customers (id, name, email, phone)
       VALUES ($1, $2, $3, '')
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING id`,
      [randomUUID(), displayName || 'Cliente', email]
    );

    if (!customer.rows[0]) return null;
    return { role: 'customer', customerId: customer.rows[0].id, supabaseUserId: user.id };
  });
}

module.exports = { isConfigured, getSupabaseUser, resolveAuthPayload };
