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
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Reparaciones del hogar', slug: '', parent_id: null }] });

    const response = await request(app).get('/api/categories/all');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([{ id: 1, name: 'Reparaciones del hogar', slug: '', parent_id: null }]);
    expect(db.query.mock.calls[0][0]).toContain('parent_id IS NULL');
    expect(db.query.mock.calls[0][0]).toContain("COALESCE(to_jsonb(category)->>'slug', '') AS slug");
  });

  test('returns categories with their specific trades nested and keeps orphaned categories visible', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        { id: 1, name: 'Reparaciones del hogar', slug: '', parent_id: null },
        { id: 2, name: 'Electricista', slug: '', parent_id: 1 },
        { id: 3, name: 'Plomero', slug: '', parent_id: 1 },
        { id: 4, name: 'Categoría heredada', slug: '', parent_id: 99 },
      ],
    });

    const response = await request(app).get('/api/categories/tree');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([
      {
        id: 1,
        name: 'Reparaciones del hogar',
        slug: '',
        parent_id: null,
        children: [
          { id: 2, name: 'Electricista', slug: '', parent_id: 1, children: [] },
          { id: 3, name: 'Plomero', slug: '', parent_id: 1, children: [] },
        ],
      },
      { id: 4, name: 'Categoría heredada', slug: '', parent_id: 99, children: [] },
    ]);
    expect(db.query.mock.calls[0][0]).toContain("COALESCE(to_jsonb(category)->>'slug', '') AS slug");
  });

  test('returns a category by id with a safe empty slug when the database has no slug column', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: 7, name: 'Salud', slug: '', parent_id: null, sort_order: 2 }],
    });

    const response = await request(app).get('/api/categories/7');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ok: true,
      data: { id: 7, name: 'Salud', slug: '', parent_id: null, sort_order: 2 },
    });
    expect(db.query.mock.calls[0][0]).toContain("COALESCE(to_jsonb(category)->>'slug', '') AS slug");
    expect(db.query.mock.calls[0][0]).toContain('WHERE id = $1 AND is_active = true');
    expect(db.query.mock.calls[0][1]).toEqual(['7']);
  });

  test('returns 404 when the requested category is not active or does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const response = await request(app).get('/api/categories/7');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ ok: false, message: 'Categoría no encontrada' });
  });
});
