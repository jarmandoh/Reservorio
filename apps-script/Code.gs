/**
 * Code.gs — Reservorio Apps Script Web App
 * 
 * ⚠️  LEGACY — Este script se mantiene para retrocompatibilidad.
 *     Los negocios nuevos usan OAuth 2.0 + Google Sheets API desde el backend.
 *     La sincronización PG → Sheets es automática vía backend/src/services/syncService.js.
 *     Este archivo puede retirarse cuando no queden negocios que lo usen directamente.
 *
 * Desplegar como "Aplicación web":
 *   - Ejecutar como: Yo
 *   - Quién tiene acceso: Cualquier persona
 * 
 * Acciones soportadas (POST con JSON en el body):
 *   reservar    → añade una fila en "Reservas" marcando la franja como Pendiente
 *   actualizar  → actualiza estado (confirmar/cancelar) de una fila
 *   addServicio → añade un servicio en la hoja "Servicios"
 */

const SHEET_NAME_RESERVAS  = 'Reservas';
const SHEET_NAME_SERVICIOS = 'Servicios';

// Columnas en la hoja Reservas (1-based)
const COL_FRANJA       = 1;
const COL_DISP         = 2;
const COL_CLIENTE      = 3;
const COL_TELEFONO     = 4;
const COL_SERVICIO     = 5;
const COL_NOTAS        = 6;

function doPost(e) {
  const result = { ok: false, message: '' };
  try {
    const ss     = SpreadsheetApp.getActiveSpreadsheet();
    const params = JSON.parse(e.postData.contents || '{}');
    const action = e.parameter.action || params.action || '';

    // --- Sanitize helper ---
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

        const sheet = ss.getSheetByName(SHEET_NAME_RESERVAS);
        if (!sheet) { result.message = 'Hoja "Reservas" no encontrada.'; break; }

        // Buscar la fila con esa franja horaria
        const data = sheet.getDataRange().getValues();
        let targetRow = -1;
        for (let i = 1; i < data.length; i++) {
          if (String(data[i][COL_FRANJA - 1]).trim() === franja) {
            targetRow = i + 1; // 1-based
            break;
          }
        }
        if (targetRow === -1) { result.message = 'Franja no encontrada.'; break; }

        const currentDisp = String(data[targetRow - 1][COL_DISP - 1]).toLowerCase();
        if (currentDisp.includes('reserv') || currentDisp.includes('conf') || currentDisp.includes('pend')) {
          result.message = 'Franja no disponible.';
          break;
        }

        sheet.getRange(targetRow, COL_DISP).setValue('Pendiente');
        sheet.getRange(targetRow, COL_CLIENTE).setValue(cliente);
        sheet.getRange(targetRow, COL_TELEFONO).setValue(telefono);
        sheet.getRange(targetRow, COL_SERVICIO).setValue(servicio);
        sheet.getRange(targetRow, COL_NOTAS).setValue(notas);

        result.ok = true;
        result.message = 'Reserva registrada.';
        break;
      }

      case 'actualizar': {
        const rowIndex     = parseInt(params.rowIndex);
        const disponibilidad = clean(params.disponibilidad);
        const notas          = clean(params.notas);

        if (!rowIndex || rowIndex < 2 || rowIndex > 10000) {
          result.message = 'rowIndex inválido.';
          break;
        }
        const allowed = ['Disponible', 'Pendiente', 'Reservado', 'Confirmado'];
        if (!allowed.includes(disponibilidad)) {
          result.message = 'Estado no permitido.';
          break;
        }

        const sheet = ss.getSheetByName(SHEET_NAME_RESERVAS);
        if (!sheet) { result.message = 'Hoja "Reservas" no encontrada.'; break; }

        sheet.getRange(rowIndex, COL_DISP).setValue(disponibilidad);
        if (notas !== undefined) sheet.getRange(rowIndex, COL_NOTAS).setValue(notas);

        // Si se cancela, limpiar datos del cliente
        if (disponibilidad === 'Disponible') {
          sheet.getRange(rowIndex, COL_CLIENTE).setValue('');
          sheet.getRange(rowIndex, COL_TELEFONO).setValue('');
          sheet.getRange(rowIndex, COL_SERVICIO).setValue('');
        }

        result.ok = true;
        result.message = 'Reserva actualizada.';
        break;
      }

      case 'addServicio': {
        const nombre = clean(params.nombre);
        if (!nombre) { result.message = 'Nombre vacío.'; break; }

        let sheet = ss.getSheetByName(SHEET_NAME_SERVICIOS);
        if (!sheet) sheet = ss.insertSheet(SHEET_NAME_SERVICIOS);

        const lastRow = sheet.getLastRow();
        sheet.getRange(lastRow + 1, 1).setValue(nombre);

        result.ok = true;
        result.message = 'Servicio añadido.';
        break;
      }

      case 'deleteServicio': {
        const nombre = clean(params.nombre);
        if (!nombre) { result.message = 'Nombre vacío.'; break; }

        const sheet = ss.getSheetByName(SHEET_NAME_SERVICIOS);
        if (!sheet) { result.message = 'Hoja "Servicios" no encontrada.'; break; }

        const data = sheet.getDataRange().getValues();
        let deletedRow = -1;
        for (let i = 0; i < data.length; i++) {
          if (String(data[i][0]).trim() === nombre) {
            deletedRow = i + 1; // 1-based
            break;
          }
        }
        if (deletedRow === -1) { result.message = 'Servicio no encontrado.'; break; }

        sheet.deleteRow(deletedRow);
        result.ok = true;
        result.message = 'Servicio eliminado.';
        break;
      }

      // ── Negocios CRUD (sólo el script maestro tiene hoja "Negocios") ──────

      case 'addNegocio': {
        // Columnas A-Q (1-17):
        // id | name | category | description | location | rating | reviews |
        // tags | gradient | icon | schedule | logo | phone | active |
        // sheetId | appsScriptUrl | pinHash
        const neg = params;
        if (!neg.id || !neg.name || !neg.category) {
          result.message = 'addNegocio: id, name y category son requeridos.';
          break;
        }
        let negSheet = ss.getSheetByName('Negocios');
        if (!negSheet) {
          negSheet = ss.insertSheet('Negocios');
          // Cabecera
          negSheet.appendRow([
            'id','name','category','description','location','rating','reviews',
            'tags','gradient','icon','schedule','logo','phone','active',
            'sheetId','appsScriptUrl','pinHash',
          ]);
        }
        // Verificar que el id no exista ya
        const negData = negSheet.getDataRange().getValues();
        for (let i = 1; i < negData.length; i++) {
          if (String(negData[i][0]).trim() === String(neg.id).trim()) {
            result.message = 'Ya existe un negocio con ese id.';
            break;
          }
        }
        if (!result.ok && result.message) break;

        negSheet.appendRow([
          clean(neg.id),
          clean(neg.name),
          clean(neg.category),
          clean(neg.description || ''),
          clean(neg.location    || ''),
          Number(neg.rating     || 5),
          Number(neg.reviews    || 0),
          clean(neg.tags        || ''),
          clean(neg.gradient    || ''),
          clean(neg.icon        || 'store'),
          clean(neg.schedule    || ''),
          clean(neg.logo        || ''),
          clean(neg.phone       || ''),
          neg.active !== false ? 'true' : 'false',
          clean(neg.sheetId        || ''),
          clean(neg.appsScriptUrl  || ''),
          clean(neg.pinHash        || ''),
        ]);
        result.ok = true;
        result.message = 'Negocio creado.';
        break;
      }

      case 'updateNegocio': {
        const negSheet = ss.getSheetByName('Negocios');
        if (!negSheet) { result.message = 'Hoja "Negocios" no encontrada.'; break; }

        const negData = negSheet.getDataRange().getValues();
        let targetRow = -1;
        for (let i = 1; i < negData.length; i++) {
          if (String(negData[i][0]).trim() === String(params.id).trim()) {
            targetRow = i + 1; // 1-based
            break;
          }
        }
        if (targetRow === -1) { result.message = 'Negocio no encontrado.'; break; }

        // Mapa: nombre de campo → columna (1-based)
        const colMap = {
          name: 2, category: 3, description: 4, location: 5,
          rating: 6, reviews: 7, tags: 8, gradient: 9, icon: 10,
          schedule: 11, logo: 12, phone: 13, active: 14,
          sheetId: 15, appsScriptUrl: 16, pinHash: 17,
        };
        for (const [field, col] of Object.entries(colMap)) {
          if (params[field] !== undefined && params[field] !== null) {
            const val = (field === 'rating' || field === 'reviews')
              ? Number(params[field])
              : clean(String(params[field]));
            negSheet.getRange(targetRow, col).setValue(val);
          }
        }
        result.ok = true;
        result.message = 'Negocio actualizado.';
        break;
      }

      case 'toggleNegocio': {
        const negSheet = ss.getSheetByName('Negocios');
        if (!negSheet) { result.message = 'Hoja "Negocios" no encontrada.'; break; }

        const negData = negSheet.getDataRange().getValues();
        let targetRow = -1;
        for (let i = 1; i < negData.length; i++) {
          if (String(negData[i][0]).trim() === String(params.id).trim()) {
            targetRow = i + 1;
            break;
          }
        }
        if (targetRow === -1) { result.message = 'Negocio no encontrado.'; break; }

        const currentVal = String(negData[targetRow - 1][13]).toLowerCase();
        const newVal     = (currentVal === 'true' || currentVal === '1') ? 'false' : 'true';
        negSheet.getRange(targetRow, 14).setValue(newVal);

        result.ok = true;
        result.message = 'Estado actualizado a ' + newVal + '.';
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

// GET no hace nada relevante (sólo ping)
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'Reservorio' }))
    .setMimeType(ContentService.MimeType.JSON);
}
