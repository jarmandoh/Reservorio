'use strict';

/**
 * Capa de canales de comunicación (email/SMS).
 *
 * Proveedores configurables por entorno:
 *   EMAIL_PROVIDER = 'console' (por defecto) | 'http'
 *   SMS_PROVIDER   = 'console' (por defecto) | 'http'
 *
 * - 'console': registra el mensaje en la salida y lo guarda en una "outbox"
 *   en memoria (útil en desarrollo y consultable en tests por getOutbox()).
 * - 'http'  : hace POST JSON a EMAIL_WEBHOOK_URL / SMS_WEBHOOK_URL con las
 *   cabeceras de EMAIL_WEBHOOK_HEADERS / SMS_WEBHOOK_HEADERS. Pensado para
 *   Resend, SendGrid, Brevo, Twilio, etc. sin añadir dependencias.
 */

const EMAIL_PROVIDER = String(process.env.EMAIL_PROVIDER || 'console').toLowerCase();
const SMS_PROVIDER   = String(process.env.SMS_PROVIDER || 'console').toLowerCase();
const EMAIL_FROM     = process.env.EMAIL_FROM || 'no-reply@reservorio.app';

const outbox = [];

function getOutbox({ clear = false } = {}) {
  const items = outbox.slice();
  if (clear) outbox.length = 0;
  return items;
}

function resetOutbox() {
  outbox.length = 0;
}

function digitsOnly(value) {
  return String(value ?? '').replace(/\D/g, '');
}

async function httpPost(url, headers, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    return { ok: false, status: response.status, message: `Proveedor HTTP respondió ${response.status}` };
  }
  return { ok: true, status: 200, message: 'sent' };
}

function parseWebhookHeaders(raw, label) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    throw new Error(`${label} debe ser un JSON válido; recibido: ${raw}`);
  }
}

function consoleEmail({ to, subject, textBody, htmlBody }) {
  const item = { channel: 'email', provider: 'console', to: String(to), subject, textBody, htmlBody: htmlBody ?? null, at: new Date().toISOString() };
  outbox.push(item);
  console.log(`[email:console] to=${item.to} subject="${item.subject}"`);
  console.log(textBody || '');
  return { ok: true, status: 202, message: 'queued', provider: 'console' };
}

async function httpEmail({ to, subject, textBody, htmlBody }) {
  const url = process.env.EMAIL_WEBHOOK_URL;
  if (!url) return { ok: false, status: 500, message: 'EMAIL_WEBHOOK_URL no configurado para EMAIL_PROVIDER=http' };
  const headers = parseWebhookHeaders(process.env.EMAIL_WEBHOOK_HEADERS, 'EMAIL_WEBHOOK_HEADERS');
  if (process.env.EMAIL_WEBHOOK_TOKEN) headers.Authorization = `Bearer ${process.env.EMAIL_WEBHOOK_TOKEN}`;
  return httpPost(url, headers, {
    from: EMAIL_FROM,
    to: String(to),
    subject,
    text: textBody,
    html: htmlBody ?? undefined,
  });
}

function consoleSms({ to, message }) {
  const item = { channel: 'sms', provider: 'console', to: String(to), message, at: new Date().toISOString() };
  outbox.push(item);
  console.log(`[sms:console] to=${item.to} message="${item.message}"`);
  return { ok: true, status: 202, message: 'queued', provider: 'console' };
}

async function httpSms({ to, message }) {
  const url = process.env.SMS_WEBHOOK_URL;
  if (!url) return { ok: false, status: 500, message: 'SMS_WEBHOOK_URL no configurado para SMS_PROVIDER=http' };
  const headers = parseWebhookHeaders(process.env.SMS_WEBHOOK_HEADERS, 'SMS_WEBHOOK_HEADERS');
  if (process.env.SMS_WEBHOOK_TOKEN) headers.Authorization = `Bearer ${process.env.SMS_WEBHOOK_TOKEN}`;
  return httpPost(url, headers, { to, message, type: 'sms' });
}

/** Envía un email. Devuelve { ok, status, message, provider? } — nunca lanza. */
async function sendEmail({ to, subject, textBody, htmlBody } = {}) {
  const cleanTo = String(to ?? '').trim();
  if (!cleanTo) return { ok: false, status: 400, message: 'Destinatario de email requerido' };
  try {
    return EMAIL_PROVIDER === 'http'
      ? await httpEmail({ to: cleanTo, subject, textBody, htmlBody })
      : consoleEmail({ to: cleanTo, subject, textBody, htmlBody });
  } catch (error) {
    console.error('[channels] sendEmail falló:', error.message);
    return { ok: false, status: 500, message: error.message };
  }
}

/** Envía un SMS. Devuelve { ok, status, message, provider? } — nunca lanza. */
async function sendSms({ to, message } = {}) {
  const cleanTo = digitsOnly(to);
  if (!cleanTo) return { ok: false, status: 400, message: 'Destinatario de SMS requerido' };
  try {
    return SMS_PROVIDER === 'http'
      ? await httpSms({ to: cleanTo, message })
      : consoleSms({ to: cleanTo, message });
  } catch (error) {
    console.error('[channels] sendSms falló:', error.message);
    return { ok: false, status: 500, message: error.message };
  }
}

module.exports = { sendEmail, sendSms, getOutbox, resetOutbox, EMAIL_PROVIDER, SMS_PROVIDER, EMAIL_FROM };