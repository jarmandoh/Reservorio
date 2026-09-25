'use strict';

const request = require('supertest');
const express = require('express');

jest.mock('../src/db', () => ({ query: jest.fn() }));

const db = require('../src/db');
const ratingsRoutes = require('../src/routes/ratings.routes');

const app = express();
app.use(express.json());
app.use('/api/ratings', ratingsRoutes);

describe('POST /api/ratings/:businessId hardening', () => {
  beforeEach(() => {
    db.query.mockReset();
  });

  test('returns 404 when the business does not exist', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const response = await request(app).post('/api/ratings/no-existe').send({ rating: 5, review: 'Excelente' });

    expect(response.status).toBe(404);
    expect(response.body.ok).toBe(false);
  });

  test('rate-limits excessive reviews (5/hora por IP)', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1 }] });

    const statuses = [];
    for (let i = 0; i < 6; i += 1) {
      const response = await request(app).post('/api/ratings/negocio1').send({ rating: 5, review: 'Genial' });
      statuses.push(response.status);
    }

    expect(statuses[0]).toBe(201);
    expect(statuses[1]).toBe(201);
    expect(statuses[2]).toBe(201);
    expect(statuses[3]).toBe(201);
    expect(statuses[5]).toBe(429);
  });
});
