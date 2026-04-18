/**
 * BusinessTemplate.gs — Reservorio Apps Script por negocio
 *
 * ⚠️  LEGACY — Este template se mantiene para negocios que aún no migraron a OAuth.
 *     Los negocios nuevos sincronizan directamente desde el backend vía Google Sheets API.
 *     Ver: backend/src/services/googleSheets.js y backend/src/services/syncService.js
 *
 * Este archivo se copia a cada Google Sheet individual de un negocio.
 *
 * Desplegar como "Aplicación web":
 *   - Ejecutar como: Yo
 *   - Quién tiene acceso: Cualquier persona
 *
 * Acciones soportadas (POST con JSON en el body):
 *   reservar      → añade una reserva en la hoja "Reservas"
 *   actualizar    → actualiza estado de una reserva
 *   addServicio   → añade un servicio en la hoja "Servicios"
 *   deleteServicio → elimina un servicio
 */

const SHEET_RESERVAS  = 'Reservas';
const SHEET_SERVICIOS = 'Servicios';

// Columnas en la hoja Reservas (1-based)
const C_FRANJA   = 1;
const C_DISP     = 2;
const C_CLIENTE  = 3;
const C_TELEFONO = 4;
const C_SERVICIO = 5;
const C_NOTAS    = 6;

function doPost(e) {
  const result = { ok: false, message: '' };
  try {
    const ss     = SpreadsheetApp.getActiveSpreadsheet();
    const params = JSON.parse(e.postData.contents || '{}');
    const action = e.parameter.action || params.action || '';

    function clean(val) {
      return String(val || '').replace(/[<>"'`]/g, '').trim().slice(0, 500);
    }

    switch (action) {

      case 'reservar': {
        const franja   = clean(params.franja);
        const cliente  = clean(params.cliente);
        const telefono = clean(params.telefono);
        const servicio = clean(params.servicio);
        const notas    = clean(params.notas);

        if (!franja || !cliente || !telefono) {
          result.message = 'Faltan campos obligatorios: franja, cliente, teléfono.';
          break;
        }
        if (!/^[0-9+\s\-]{7,15}$/.test(telefono)) {
          result.message = 'Teléfono inválido.';
          break;
        }

        let sheet = ss.getSheetByName(SHEET_RESERVAS);
        if (!sheet) { result.message = 'Hoja "Reservas" no encontrada.'; break; }

        const data = sheet.getDataRange().getValues();
        let targetRow = -1;
        for (let i = 1; i < data.length; i++) {
          if (String(data[i][C_FRANJA - 1]).trim() === franja) {
            targetRow = i + 1;
            break;
          }
        }
        if (targetRow === -1) { result.message = 'Franja no encontrada.'; break; }

        const currentDisp = String(data[targetRow - 1][C_DISP - 1]).toLowerCase();
        if (currentDisp.includes('reserv') || currentDisp.includes('conf') || currentDisp.includes('pend')) {
          result.message = 'Franja no disponible.';
          break;
        }

        sheet.getRange(targetRow, C_DISP).setValue('Pendiente');
        sheet.getRange(targetRow, C_CLIENTE).setValue(cliente);
        sheet.getRange(targetRow, C_TELEFONO).setValue(telefono);
        sheet.getRange(targetRow, C_SERVICIO).setValue(servicio);
        sheet.getRange(targetRow, C_NOTAS).setValue(notas);

        result.ok = true;
        result.message = 'Reserva registrada.';
        break;
      }

      case 'actualizar': {
        const rowIndex       = parseInt(params.rowIndex);
        const disponibilidad = clean(params.disponibilidad);
        const notas          = clean(params.notas);

        if (!rowIndex || rowIndex < 2 || rowIndex > 50000) {
          result.message = 'rowIndex inválido.';
          break;
        }
        const allowed = ['Disponible', 'Pendiente', 'Reservado', 'Confirmado'];
        if (!allowed.includes(disponibilidad)) {
          result.message = 'Estado no permitido.';
          break;
        }

        const sheet = ss.getSheetByName(SHEET_RESERVAS);
        if (!sheet) { result.message = 'Hoja "Reservas" no encontrada.'; break; }

        sheet.getRange(rowIndex, C_DISP).setValue(disponibilidad);
        if (notas !== undefined) sheet.getRange(rowIndex, C_NOTAS).setValue(notas);

        if (disponibilidad === 'Disponible') {
          sheet.getRange(rowIndex, C_CLIENTE).setValue('');
          sheet.getRange(rowIndex, C_TELEFONO).setValue('');
          sheet.getRange(rowIndex, C_SERVICIO).setValue('');
        }

        result.ok = true;
        result.message = 'Reserva actualizada.';
        break;
      }

      case 'addServicio': {
        const nombre = clean(params.nombre);
        if (!nombre) { result.message = 'Nombre vacío.'; break; }

        let sheet = ss.getSheetByName(SHEET_SERVICIOS);
        if (!sheet) sheet = ss.insertSheet(SHEET_SERVICIOS);

        sheet.getRange(sheet.getLastRow() + 1, 1).setValue(nombre);
        result.ok = true;
        result.message = 'Servicio añadido.';
        break;
      }

      case 'deleteServicio': {
        const nombre = clean(params.nombre);
        if (!nombre) { result.message = 'Nombre vacío.'; break; }

        const sheet = ss.getSheetByName(SHEET_SERVICIOS);
        if (!sheet) { result.message = 'Hoja "Servicios" no encontrada.'; break; }

        const data = sheet.getDataRange().getValues();
        let deletedRow = -1;
        for (let i = 0; i < data.length; i++) {
          if (String(data[i][0]).trim() === nombre) { deletedRow = i + 1; break; }
        }
        if (deletedRow === -1) { result.message = 'Servicio no encontrado.'; break; }

        sheet.deleteRow(deletedRow);
        result.ok = true;
        result.message = 'Servicio eliminado.';
        break;
      }

      default:
        result.message = 'Acción desconocida: ' + action;
    }
  } catch (err) {
    result.message = 'Error interno: ' + err.message;
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'Reservorio-Business' }))
    .setMimeType(ContentService.MimeType.JSON);
}
