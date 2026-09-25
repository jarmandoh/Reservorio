'use strict';

const { google } = require('googleapis');
const db = require('../db');
const gsheets = require('./googleSheets');
const logger = require('../logger');
const { clean } = require('../middleware/sanitize');

/**
 * Sincroniza TODAS las reservas de un negocio: PG �  Google Sheets.
 * Sobreescribe la hoja "Reservas" completa (cabecera + datos).
 */
async function syncReservations(businessId) {
  const { rows: negocio } = await db.query(
    'SELECT google_sheet_id, google_access_token FROM businesses WHERE id = $1',
    [businessId]
  );
  if (!negocio.length || !negocio[0].google_sheet_id || !negocio[0].google_access_token) return;

  const auth = await gsheets.getAuthClient(businessId);
  const sheets = google.sheets({ version: 'v4', auth });
  const sheetId = negocio[0].google_sheet_id;

  const { rows } = await db.query(
    'SELECT franja, disponibilidad, cliente, telefono, servicio, notas FROM reservations WHERE business_id = $1 ORDER BY franja',
    [businessId]
  );

  const values = [
    ['Franja', 'Disponibilidad', 'Cliente', 'Teléfono', 'Servicio', 'Notas'],
    ...rows.map(r => [r.franja, r.disponibilidad, r.cliente, r.telefono, r.servicio, r.notas]),
  ];

  // Limpiar hoja y escribir todo
  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: 'Reservas!A:F',
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: 'Reservas!A1',
    valueInputOption: 'RAW',
    requestBody: { values },
  });
}

/**
 * Sincroniza TODOS los servicios de un negocio: PG �  Google Sheets.
 */
async function syncServices(businessId) {
  const { rows: negocio } = await db.query(
    'SELECT google_sheet_id, google_access_token FROM businesses WHERE id = $1',
    [businessId]
  );
  if (!negocio.length || !negocio[0].google_sheet_id || !negocio[0].google_access_token) return;

  const auth = await gsheets.getAuthClient(businessId);
  const sheets = google.sheets({ version: 'v4', auth });
  const sheetId = negocio[0].google_sheet_id;

  const { rows } = await db.query('SELECT nombre FROM services WHERE business_id = $1 ORDER BY nombre', [businessId]);

  const values = [['Nombre'], ...rows.map(r => [r.nombre])];

  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: 'Servicios!A:A',
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: 'Servicios!A1',
    valueInputOption: 'RAW',
    requestBody: { values },
  });
}

/**
 * Sincronización completa (reservas + servicios).
 */
async function syncAll(businessId) {
  await syncReservations(businessId);
  await syncServices(businessId);
}

/**
 * Fire-and-forget: lanza sync en background sin bloquear.
 * Registra errores pero no los propaga.
 */
function syncInBackground(businessId, type = 'all') {
  const fn = type === 'reservations' ? syncReservations : type === 'services' ? syncServices : syncAll;

  fn(businessId).catch(err => {
    logger.error(`[Sync] Error sincronizando ${type} para ${businessId}:`, err.message);
  });
}

async function bulkCreateSlots(businessId, slots) {
  if (!Array.isArray(slots) || !slots.length) {
    return { success: true, message: '0 slots created' };
  }
  if (!businessId) throw new Error('businessId requerido en bulkCreateSlots');

  const rows = slots.map(s => {
    const franja = clean(String(s.franja ?? '').trim());
    if (!franja) throw new Error('franja requerida en cada slot');
    const disponibilidad = clean(String(s.disponibilidad ?? 'Disponible').trim()) || 'Disponible';
    // validar enum
    const allowed = new Set(['Disponible', 'Pendiente', 'Reservado', 'Confirmado', 'Cancelado']);
    if (!allowed.has(disponibilidad)) throw new Error(`disponibilidad no permitida: ${disponibilidad}`);
    return [
      franja,
      disponibilidad,
      s.cliente ? clean(String(s.cliente)) : null,
      s.telefono ? clean(String(s.telefono)) : null,
      s.servicio ? clean(String(s.servicio)) : null,
      s.notas ? clean(String(s.notas)) : null,
      businessId,
    ];
  });

  const placeholders = rows
    .map(
      (_, i) => `($${i * 7 + 1},$${i * 7 + 2},$${i * 7 + 3},$${i * 7 + 4},$${i * 7 + 5},$${i * 7 + 6},$${i * 7 + 7})`
    )
    .join(', ');
  const flat = rows.flat();

  await db.query(
    `INSERT INTO reservations (franja, disponibilidad, cliente, telefono, servicio, notas, business_id) VALUES ${placeholders}`,
    flat
  );
  return { success: true, message: `${slots.length} slots created` };
}

module.exports = { syncReservations, syncServices, syncAll, syncInBackground, bulkCreateSlots };
