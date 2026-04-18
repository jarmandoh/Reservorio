/**
 * Reservorio — Google Sheets Data Layer
 * 
 * La hoja de cálculo debe ser pública (compartir → "Cualquier persona con el enlace puede ver")
 * o usar una Apps Script Web App como proxy para escritura.
 * 
 * Estructura esperada de "Reservas" (hoja 1):
 *   A: Franja horaria  B: Disponibilidad  C: Cliente  D: Teléfono  E: Servicio  F: Notas
 * 
 * Estructura esperada de "Servicios" (hoja 2):
 *   A: Nombre servicio
 */

const SHEET_ID = '1cxZR6YYFkXJy8AKGM-1AakGk9hw6AR9vTv2RHm4yUNc';

// ── Google Sheets JSON API (lectura pública) ──────────────────────────────
function sheetUrl(sheetName) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
}

async function fetchSheetData(sheetName) {
  const resp = await fetch(sheetUrl(sheetName));
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const text = await resp.text();
  // Google devuelve /*O_o*/ google.visualization.Query.setResponse({…});
  const json = JSON.parse(text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/)[1]);
  return parseGVizTable(json.table);
}

function parseGVizTable(table) {
  if (!table || !table.rows) return [];
  const cols = table.cols.map(c => c.label || c.id);
  return table.rows
    .filter(r => r.c && r.c.some(cell => cell && cell.v !== null && cell.v !== ''))
    .map(r => {
      const obj = {};
      cols.forEach((col, i) => {
        const cell = r.c[i];
        obj[col] = cell ? (cell.f ?? cell.v ?? '') : '';
      });
      return obj;
    });
}

// ── Apps Script Web App (escritura) ──────────────────────────────────────
// El usuario debe desplegar una Apps Script Web App en la hoja de cálculo.
// La URL se configura aquí:
let APPS_SCRIPT_URL = localStorage.getItem('reservorio_script_url') || '';

function saveScriptUrl(url) {
  APPS_SCRIPT_URL = url.trim();
  localStorage.setItem('reservorio_script_url', APPS_SCRIPT_URL);
}

async function writeToSheet(action, payload) {
  if (!APPS_SCRIPT_URL) throw new Error('No se ha configurado la URL del script de escritura.');
  const url = `${APPS_SCRIPT_URL}?action=${action}`;
  const resp = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'text/plain' }, // evita preflight CORS
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

// ── Normalización de campos ───────────────────────────────────────────────
// Acepta nombres de columna con o sin tildes, espacios, etc.
function normalizeKey(str) {
  return String(str)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\s+/g, '_');
}

function normalizeRow(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[normalizeKey(k)] = v;
  }
  // Aliasas comunes
  const aliases = {
    franja: ['franja_horaria', 'horario', 'hora', 'franja'],
    disponibilidad: ['disponibilidad', 'disponible', 'estado'],
    cliente: ['cliente', 'nombre', 'name'],
    telefono: ['telefono', 'phone', 'tel'],
    servicio: ['servicio', 'service'],
    notas: ['notas', 'nota', 'notes', 'observaciones'],
  };
  const norm = {};
  for (const [canonical, keys] of Object.entries(aliases)) {
    for (const k of keys) {
      if (out[k] !== undefined) { norm[canonical] = out[k]; break; }
    }
    if (norm[canonical] === undefined) norm[canonical] = '';
  }
  norm._raw = row;
  norm._rowIndex = row._rowIndex;
  return norm;
}

// ── Estado global ─────────────────────────────────────────────────────────
const Store = {
  reservas: [],
  servicios: [],
  loading: false,
  error: null,
  listeners: {},
  on(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  },
  emit(event, data) {
    (this.listeners[event] || []).forEach(fn => fn(data));
  },
  async loadAll() {
    this.loading = true;
    this.emit('loading', true);
    this.error = null;
    try {
      const [reservasRaw, serviciosRaw] = await Promise.all([
        fetchSheetData('Reservas').catch(() => fetchSheetData('Sheet1')),
        fetchSheetData('Servicios').catch(() => []),
      ]);
      this.reservas = reservasRaw.map((r, i) => normalizeRow({ ...r, _rowIndex: i + 2 }));
      // Servicios: primera columna
      this.servicios = serviciosRaw
        .map(r => Object.values(r)[0])
        .filter(s => s && String(s).trim());
      this.emit('data', { reservas: this.reservas, servicios: this.servicios });
    } catch (e) {
      this.error = e.message;
      this.emit('error', e.message);
    } finally {
      this.loading = false;
      this.emit('loading', false);
    }
  },
};

// ── Utilidades de UI ───────────────────────────────────────────────────────
function showToast(message, type = 'default') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info';
  toast.innerHTML = `<span class="material-icons-round" style="font-size:1.1rem">${icon}</span>${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3100);
}

function setLoading(selector, isLoading) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.disabled = isLoading;
  if (isLoading) {
    el._originalText = el.innerHTML;
    el.innerHTML = '<span class="material-icons-round" style="animation:spin 0.8s linear infinite;font-size:1.1rem">refresh</span> Cargando…';
  } else if (el._originalText) {
    el.innerHTML = el._originalText;
  }
}

const styleEl = document.createElement('style');
styleEl.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
document.head.appendChild(styleEl);

// ── Exportar para uso en HTML ──────────────────────────────────────────────
window.Reservorio = { Store, showToast, setLoading, writeToSheet, saveScriptUrl, SHEET_ID };
