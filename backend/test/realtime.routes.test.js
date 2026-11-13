'use strict';

process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { EventEmitter } = require('events');

jest.mock('../src/db', () => ({ query: jest.fn() }));

const db = require('../src/db');
const realtimeRoutes = require('../src/routes/realtime.routes');
const realtimeService = require('../src/services/realtime.service');

const app = express();
app.use('/api/realtime', realtimeRoutes);

describe('Realtime access control', () => {
  afterEach(() => {
    for (const client of realtimeService._clients.keys()) {
      client.emit('close');
    }
  });

  test('rejects anonymous stream requests', async () => {
    const response = await request(app).get('/api/realtime/stream?businessId=business-1');
    expect(response.status).toBe(401);
  });

  test('rejects users without access to the requested business', async () => {
    const token = jwt.sign({ role: 'business-admin', businessId: 'business-2' }, 'test-secret');
    const response = await request(app)
      .get('/api/realtime/stream?businessId=business-1')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(db.query).not.toHaveBeenCalled();
  });

  test('delivers booking events only to the subscribed business', () => {
    const first = new EventEmitter();
    const second = new EventEmitter();
    first.write = jest.fn();
    second.write = jest.fn();
    realtimeService.addClient(first, 'business-1');
    realtimeService.addClient(second, 'business-2');

    realtimeService.broadcastBookingCreated({
      id: 'booking-1',
      provider_id: 'business-1',
      customer_id: 'customer-1',
    });

    expect(first.write).toHaveBeenCalledTimes(1);
    expect(second.write).not.toHaveBeenCalled();
    first.emit('close');
    second.emit('close');
  });
});
