'use strict';

const { google } = require('googleapis');
const db = require('../db');
const { encrypt, decrypt } = require('../utils/crypto');

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI  = process.env.GOOGLE_REDIRECT_URI;

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
  console.warn('[WARN] Variables de Google OAuth no configuradas (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI).');
}

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
];

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Crea un OAuth2Client base (sin tokens).
 */
function createOAuth2Client() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

/**
 * Genera la URL de consentimiento OAuth.
 * @param {string} state — JWT firmado con businessId (protección CSRF)
 */
function getAuthUrl(state) {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
  });
}

/**
 * Intercambia el authorization code por tokens.
 */
async function exchangeCode(code) {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  return tokens; // { access_token, refresh_token, expiry_date, ... }
}

/**
 * Obtiene el email del usuario autenticado.
 */
async function getUserEmail(accessToken) {
  const client = createOAuth2Client();
  client.setCredentials({ access_token: accessToken });
  const oauth2 = google.oauth2({ version: 'v2', auth: client });
  const { data } = await oauth2.userinfo.get();
  return data.email;
}

/**
 * Guarda tokens cifrados en la BD y asocia el email.
 */
async function saveTokens(businessId, tokens, email) {
  const expiry = tokens.expiry_date ? new Date(tokens.expiry_date) : null;
  await db.query(
    `UPDATE businesses
        SET google_email          = $1,
            google_access_token   = $2,
            google_refresh_token  = $3,
            google_token_expiry   = $4
      WHERE id = $5`,
    [
      email,
      encrypt(tokens.access_token),
      tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      expiry,
      businessId,
    ]
  );
}

/**
 * Construye un OAuth2Client autenticado para un negocio dado.
 * Refresca automáticamente si el access_token expiró.
 */
async function getAuthClient(businessId) {
  const { rows } = await db.query(
    `SELECT google_access_token, google_refresh_token, google_token_expiry
       FROM businesses WHERE id = $1`,
    [businessId]
  );
  if (!rows.length) throw new Error('Negocio no encontrado.');
  const biz = rows[0];
  if (!biz.google_access_token) throw new Error('Google no vinculado a este negocio.');

  const accessToken  = decrypt(biz.google_access_token);
  const refreshToken = biz.google_refresh_token ? decrypt(biz.google_refresh_token) : null;

  const client = createOAuth2Client();
  client.setCredentials({
    access_token:  accessToken,
    refresh_token: refreshToken,
    expiry_date:   biz.google_token_expiry ? new Date(biz.google_token_expiry).getTime() : null,
  });

  // Auto-refresh si expiró
  const now = Date.now();
  const expiry = biz.google_token_expiry ? new Date(biz.google_token_expiry).getTime() : 0;
  if (expiry && expiry < now + 60_000 && refreshToken) {
    const { credentials } = await client.refreshAccessToken();
    await saveTokens(businessId, credentials, null);
    // Actualizar solo tokens, no email
    await db.query(
      `UPDATE businesses
          SET google_access_token  = $1,
              google_token_expiry  = $2
        WHERE id = $3`,
      [
        encrypt(credentials.access_token),
        credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        businessId,
      ]
    );
    client.setCredentials(credentials);
  }

  return client;
}

/**
 * Revoca tokens y limpia columnas Google del negocio.
 */
async function disconnect(businessId) {
  const { rows } = await db.query(
    'SELECT google_access_token FROM businesses WHERE id = $1',
    [businessId]
  );
  if (rows.length && rows[0].google_access_token) {
    try {
      const token = decrypt(rows[0].google_access_token);
      const client = createOAuth2Client();
      await client.revokeToken(token);
    } catch (_) { /* token ya expirado/revocado — ignorar */ }
  }
  await db.query(
    `UPDATE businesses
        SET google_email          = NULL,
            google_access_token   = NULL,
            google_refresh_token  = NULL,
            google_token_expiry   = NULL,
            google_sheet_id       = NULL
      WHERE id = $1`,
    [businessId]
  );
}

/**
 * Lee datos de la spreadsheet vinculada.
 */
async function readSheet(businessId, range) {
  const auth   = await getAuthClient(businessId);
  const sheets = google.sheets({ version: 'v4', auth });
  const { rows } = await db.query('SELECT google_sheet_id FROM businesses WHERE id = $1', [businessId]);
  const sheetId = rows[0]?.google_sheet_id;
  if (!sheetId) throw new Error('No hay spreadsheet vinculada.');

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });
  return res.data.values || [];
}

/**
 * Escribe datos en la spreadsheet vinculada.
 */
async function writeSheet(businessId, range, values) {
  const auth   = await getAuthClient(businessId);
  const sheets = google.sheets({ version: 'v4', auth });
  const { rows } = await db.query('SELECT google_sheet_id FROM businesses WHERE id = $1', [businessId]);
  const sheetId = rows[0]?.google_sheet_id;
  if (!sheetId) throw new Error('No hay spreadsheet vinculada.');

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: { values },
  });
}

/**
 * Crea una spreadsheet con la estructura de Reservorio
 * y la vincula al negocio.
 */
async function createTemplateSheet(businessId, businessName) {
  const auth   = await getAuthClient(businessId);
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: `${businessName} — Reservorio` },
      sheets: [
        {
          properties: { title: 'Reservas' },
          data: [{
            startRow: 0, startColumn: 0,
            rowData: [{
              values: [
                { userEnteredValue: { stringValue: 'Franja' } },
                { userEnteredValue: { stringValue: 'Disponibilidad' } },
                { userEnteredValue: { stringValue: 'Cliente' } },
                { userEnteredValue: { stringValue: 'Teléfono' } },
                { userEnteredValue: { stringValue: 'Servicio' } },
                { userEnteredValue: { stringValue: 'Notas' } },
              ],
            }],
          }],
        },
        {
          properties: { title: 'Servicios' },
          data: [{
            startRow: 0, startColumn: 0,
            rowData: [{
              values: [
                { userEnteredValue: { stringValue: 'Nombre' } },
              ],
            }],
          }],
        },
      ],
    },
  });

  const newSheetId = res.data.spreadsheetId;
  await db.query('UPDATE businesses SET google_sheet_id = $1 WHERE id = $2', [newSheetId, businessId]);
  return newSheetId;
}

module.exports = {
  getAuthUrl,
  exchangeCode,
  getUserEmail,
  saveTokens,
  getAuthClient,
  disconnect,
  readSheet,
  writeSheet,
  createTemplateSheet,
};
