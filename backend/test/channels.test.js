'use strict';

// El proveedor se lee en el require, así que se fija el env antes de cargar.
function loadChannels(env = {}) {
  jest.resetModules();
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return require('../src/services/channels');
}

describe('channels — capa de email/SMS', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  test('console email registra en la outbox y se puede limpiar', async () => {
    const channels = loadChannels();
    const result = await channels.sendEmail({ to: 'ana@example.com', subject: 'Hola', textBody: 'Cuerpo' });

    expect(result.ok).toBe(true);
    expect(result.provider).toBe('console');
    const outbox = channels.getOutbox();
    expect(outbox).toHaveLength(1);
    expect(outbox[0].channel).toBe('email');
    expect(outbox[0].to).toBe('ana@example.com');
    expect(outbox[0].subject).toBe('Hola');
    expect(outbox[0].textBody).toBe('Cuerpo');

    expect(channels.getOutbox({ clear: true })).toHaveLength(1);
    expect(channels.getOutbox()).toHaveLength(0);
  });

  test('sendEmail rechaza sin destinatario', async () => {
    const channels = loadChannels();
    const result = await channels.sendEmail({ subject: 'x', textBody: 'y' });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });

  test('console sms normaliza el teléfono a dígitos', async () => {
    const channels = loadChannels();
    const result = await channels.sendSms({ to: '+34 600 123 456', message: 'Código 123456' });

    expect(result.ok).toBe(true);
    const outbox = channels.getOutbox();
    expect(outbox).toHaveLength(1);
    expect(outbox[0].channel).toBe('sms');
    expect(outbox[0].to).toBe('34600123456');
  });

  test('sendSms rechaza sin teléfono', async () => {
    const channels = loadChannels();
    const result = await channels.sendSms({ message: 'x' });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });

  test('http email envía POST JSON al webhook con cabeceras', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200 });
    const channels = loadChannels({ EMAIL_PROVIDER: 'http', EMAIL_WEBHOOK_URL: 'https://mail.example.com/send', EMAIL_WEBHOOK_HEADERS: '{"X-Custom":"1"}', EMAIL_WEBHOOK_TOKEN: 'tok123', EMAIL_FROM: 'no-reply@reservorio.app' });

    const result = await channels.sendEmail({ to: 'client@example.com', subject: 'Asunto', textBody: 'Texto' });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://mail.example.com/send');
    expect(options.headers).toMatchObject({ 'content-type': 'application/json', 'X-Custom': '1', Authorization: 'Bearer tok123' });
    const body = JSON.parse(options.body);
    expect(body).toMatchObject({ from: 'no-reply@reservorio.app', to: 'client@example.com', subject: 'Asunto', text: 'Texto' });
  });

  test('http email devuelve fallo cuando el proveedor responde error', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 503 });
    const channels = loadChannels({ EMAIL_PROVIDER: 'http', EMAIL_WEBHOOK_URL: 'https://mail.example.com/send' });

    const result = await channels.sendEmail({ to: 'a@b.co', subject: 's', textBody: 't' });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(503);
  });

  test('http email sin URL configurada devuelve 500', async () => {
    const channels = loadChannels({ EMAIL_PROVIDER: 'http', EMAIL_WEBHOOK_URL: undefined });
    const result = await channels.sendEmail({ to: 'a@b.co', subject: 's', textBody: 't' });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
    expect(result.message).toContain('EMAIL_WEBHOOK_URL');
  });

  test('http sms envía el teléfono normalizado', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200 });
    const channels = loadChannels({ SMS_PROVIDER: 'http', SMS_WEBHOOK_URL: 'https://sms.example.com/send' });

    const result = await channels.sendSms({ to: '+34 600 111 222', message: 'Mensaje' });
    expect(result.ok).toBe(true);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.to).toBe('34600111222');
  });
});