'use strict';

const { google } = require('googleapis');
const db         = require('../db');
const gsheets    = require('./googleSheets');

/**
 * Sincroniza TODAS las reservas de un negocio: PG → Google Sheets.
 * Sobreescribe la hoja "Reservas" completa (cabecera + datos).
 */
async function syncReservations(businessId) {
  const { rows: biz } = await db.query(
    'SELECT google_sheet_id, google_access_token FROM businesses WHERE id = $1',
    [businessId]
  );
  if (!biz.length || !biz[0].google_sheet_id || !biz[0].google_access_token) return;

  const auth   = await gsheets.getAuthClient(businessId);
  const sheets = google.sheets({ version: 'v4', auth });
  const sheetId = biz[0].google_sheet_id;

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
 * Sincroniza TODOS los servicios de un negocio: PG → Google Sheets.
 */
async function syncServices(businessId) {
  const { rows: biz } = await db.query(
    'SELECT google_sheet_id, google_access_token FROM businesses WHERE id = $1',
    [businessId]
  );
  if (!biz.length || !biz[0].google_sheet_id || !biz[0].google_access_token) return;

  const auth   = await gsheets.getAuthClient(businessId);
  const sheets = google.sheets({ version: 'v4', auth });
  const sheetId = biz[0].google_sheet_id;

  const { rows } = await db.query(
    'SELECT nombre FROM services WHERE business_id = $1 ORDER BY nombre',
    [businessId]
  );

  const values = [
    ['Nombre'],
    ...rows.map(r => [r.nombre]),
  ];

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
  const fn = type === 'reservations' ? syncReservations
           : type === 'services'     ? syncServices
           : syncAll;

  fn(businessId).catch(err => {
    console.error(`[Sync] Error sincronizando ${type} para ${businessId}:`, err.message);
  });
}

async function bulkCreateSlots(businessId, slots) {
  const values = slots.map(s => `('${s.franja}', ${s.disponibilidad}, ${s.cliente ? `'${s.cliente}'` : 'NULL'}, ${s.telefono ? `'${s.telefono}'` : 'NULL'}, ${s.servicio ? `'${s.servicio}'` : 'NULL'}, ${s.notas ? `'${s.notas}'` : 'NULL'}, ${businessId})`).join(', ');  
  const query = `INSERT INTO reservations (franja, disponibilidad, cliente, telefono, servicio, notas, business_id) VALUES ${values}`;
  await db.query(query);
  return { success: true, message: `${slots.length} slots created` };
} 

module.exports = { syncReservations, syncServices, syncAll, syncInBackground, bulkCreateSlots };
