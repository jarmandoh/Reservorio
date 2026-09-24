'use strict';

jest.mock('../src/db', () => ({
  query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
}));

const request = require('supertest');
const { app } = require('../src/index');

describe('Monitoring endpoints', () => {
  test('GET /health returns service status and database info', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.service).toBe('reservorio-api');
    expect(response.body.database).toBe('connected');
  });

  test('GET /metrics returns app metrics payload', async () => {
    const response = await request(app).get('/metrics');

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.service).toBe('reservorio-api');
    expect(response.body.uptime).toEqual(expect.any(Number));
    expect(response.body.memory).toHaveProperty('rss');
    expect(response.body.statusCodes).toBeDefined();
    expect(response.body.requests).toBeGreaterThanOrEqual(1);
  });

  test('GET /metrics reports moving-average latency percentiles (p50/p95/p99)', async () => {
    const response = await request(app).get('/metrics');

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.latency).toBeDefined();
    expect(response.body.latency).toHaveProperty('p50');
    expect(response.body.latency).toHaveProperty('p95');
    expect(response.body.latency).toHaveProperty('p99');
    expect(typeof response.body.latency.p95).toBe('number');
    expect(response.body.latency.samples).toBeGreaterThanOrEqual(1);
  });
});
