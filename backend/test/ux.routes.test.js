'use strict';

const request = require('supertest');
const express = require('express');
const uxRoutes = require('../src/routes/ux.routes');

const app = express();
app.use(express.json());
app.use('/api/ux-tips', uxRoutes);

describe('UX tips route', () => {
  test('GET /api/ux-tips returns 10 UX tips', async () => {
    const response = await request(app).get('/api/ux-tips');

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data).toHaveLength(10);
    expect(response.body.data[0]).toMatchObject({
      title: expect.any(String),
      description: expect.any(String),
    });
  });
});
