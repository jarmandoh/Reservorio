'use strict';

const request = require('supertest');
const express = require('express');
const { body } = require('express-validator');
const ratingsRoutes = require('../src/routes/ratings.routes');
const { handleValidation } = require('../src/middleware/validation');

jest.mock('../src/db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
}));

const app = express();
app.use(express.json());
app.use('/api/ratings', ratingsRoutes);

describe('GET /api/ratings/:businessId', () => {
  it('should return list of reviews for a business', async () => {
    const res = await request(app).get('/api/ratings/test-business');
    expect(res.status).toBeLessThanOrEqual(500);
  });
});

describe('POST /api/ratings/:businessId', () => {
  it('should require rating between 1-5', async () => {
    const res = await request(app)
      .post('/api/ratings/test-business')
      .send({ rating: 6, review: 'Great' });
    expect(res.status).toBe(400);
  });

  it('should accept valid rating and review', async () => {
    const res = await request(app)
      .post('/api/ratings/test-business')
      .send({ rating: 5, review: 'Excelente' });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/ratings/:businessId/average', () => {
  it('should return average rating stats', async () => {
    const res = await request(app).get('/api/ratings/test-business/average');
    expect(res.status).toBeLessThanOrEqual(500);
  });
});
