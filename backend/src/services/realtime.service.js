'use strict';

/**
 * SSE realtime broadcaster para bookings.
 * Mantiene un Set de clientes conectados y difunde eventos.
 * Usado por bookings.service y businesses.service en create/update.
 */

const logger = require('../logger');

const clients = new Set();

function addClient(res) {
  clients.add(res);
  // ping cada 25s para mantener conexión viva tras proxies
  const ping = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {}
  }, 25_000);

  const cleanup = () => {
    clearInterval(ping);
    clients.delete(res);
  };

  res.on('close', cleanup);
  res.on('finish', cleanup);
  res.on('error', cleanup);

  logger.info(`[realtime] cliente conectado (${clients.size} activos)`);
}

function removeClient(res) {
  clients.delete(res);
}

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of [...clients]) {
    try {
      res.write(payload);
    } catch (e) {
      logger.warn('[realtime] broadcast falló, removiendo cliente:', e.message);
      clients.delete(res);
    }
  }
}

function broadcastBookingCreated(booking) {
  broadcast('booking_created', {
    id: booking.id,
    providerId: booking.provider_id ?? booking.providerId,
    customerId: booking.customer_id ?? booking.customerId,
    serviceId: booking.service_id ?? booking.serviceId,
    date: booking.booking_date ?? booking.date,
    slot: booking.slot,
    status: booking.status,
    createdAt: booking.created_at ?? booking.createdAt,
  });
}

function broadcastBookingUpdated(booking) {
  broadcast('booking_updated', {
    id: booking.id,
    providerId: booking.provider_id ?? booking.providerId,
    status: booking.status,
    updatedAt: booking.updated_at ?? new Date().toISOString(),
  });
}

function sseHandler(req, res) {
  const businessId = String(req.query.businessId ?? '').trim();

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': req.headers.origin || '*',
    'Access-Control-Allow-Credentials': 'true',
  });

  // Enviar retry y evento inicial
  res.write('retry: 5000\n');
  res.write(
    `data: ${JSON.stringify({ type: 'connected', businessId: businessId || null, at: new Date().toISOString() })}\n\n`
  );

  addClient(res);

  // Filtrado por businessId se hace en cliente (EventSource) para simplicidad;
  // el servidor difunde a todos y el cliente ignora otros negocios.
}

module.exports = {
  addClient,
  removeClient,
  broadcast,
  broadcastBookingCreated,
  broadcastBookingUpdated,
  sseHandler,
  // para tests
  _clients: clients,
};
