'use strict';

const request = require('supertest');
const express = require('express');

jest.mock('../src/db', () => ({ query: jest.fn() }));

const db = require('../src/db');
const categoriesRoutes = require('../src/routes/categories.routes');
const app = express();
app.use('/api/categories', categoriesRoutes);

describe('Categories routes', () => {
  beforeEach(() => {
    db.query.mockReset();
  });

  test('returns only active root categories in the legacy list endpoint', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Reparaciones del hogar', parent_id: null }] });

    const response = await request(app).get('/api/categories/all');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([{ id: 1, name: 'Reparaciones del hogar', parent_id: null }]);
    expect(db.query.mock.calls[0][0]).toContain('parent_id IS NULL');
  });

  test('returns categories with their specific trades nested under each parent', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        { id: 1, name: 'Reparaciones del hogar', slug: 'reparaciones-del-hogar', parent_id: null },
        { id: 2, name: 'Electricista', slug: 'electricista', parent_id: 1 },
        { id: 3, name: 'Plomero', slug: 'plomero', parent_id: 1 },
      ],
    });

    const response = await request(app).get('/api/categories/tree');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([
      {
        id: 1,
        name: 'Reparaciones del hogar',
        slug: 'reparaciones-del-hogar',
        parent_id: null,
        children: [
          { id: 2, name: 'Electricista', slug: 'electricista', parent_id: 1, children: [] },
          { id: 3, name: 'Plomero', slug: 'plomero', parent_id: 1, children: [] },
        ],
      },
    ]);
  });
});
