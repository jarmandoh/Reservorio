'use strict';

process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const express = require('express');
jest.mock('../src/db', () => ({ query: jest.fn() }));

const db = require('../src/db');
const { sign } = require('../src/middleware/jwt');
const { router: productsRoutes, createSignature } = require('../src/routes/products.routes');

const app = express();
app.use(express.json());
app.use('/api/businesses/:businessId/products', productsRoutes);

const businessId = 'negocio-1';
const token = sign({ role: 'business-admin', businessId });
const uploadedProduct = {
  name: 'Café de origen',
  description: 'Tueste medio, notas de cacao.',
  category: 'Café',
  price: 18000,
  imageUrl: 'https://res.cloudinary.com/demo/image/upload/reservorio/negocio-1/products/cafe',
  imagePublicId: 'reservorio/negocio-1/products/cafe',
};

describe('Products routes', () => {
  beforeEach(() => {
    db.query.mockReset();
    process.env.CLOUDINARY_CLOUD_NAME = 'demo';
    process.env.CLOUDINARY_API_KEY = 'api-key';
    process.env.CLOUDINARY_API_SECRET = 'api-secret';
  });

  test('lists active products publicly by business', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 'product-1', name: 'Café' }] });

    const response = await request(app).get(`/api/businesses/${businessId}/products`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([{ id: 'product-1', name: 'Café' }]);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('WHERE business_id = $1 AND active = true'), [
      businessId,
    ]);
  });

  test('signs an upload for the authenticated business without returning its secret', async () => {
    const response = await request(app)
      .post(`/api/businesses/${businessId}/products/image-signature`)
      .set('Authorization', `Bearer ${token}`)
      .send({ assetType: 'product' });

    expect(response.status).toBe(200);
    expect(response.body.data.publicId).toMatch(/^reservorio\/negocio-1\/products\//);
    expect(response.body.data.signature).toMatch(/^[a-f0-9]{40}$/);
    expect(response.body.data).not.toHaveProperty('apiSecret');
  });

  test('rejects a request to sign images without an authorized business session', async () => {
    const response = await request(app)
      .post(`/api/businesses/${businessId}/products/image-signature`)
      .send({ assetType: 'product' });

    expect(response.status).toBe(401);
  });

  test('creates a product only from an image signed for the same business', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 'product-1', ...uploadedProduct }] });

    const response = await request(app)
      .post(`/api/businesses/${businessId}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send(uploadedProduct);

    expect(response.status).toBe(201);
    expect(response.body.data.id).toBe('product-1');
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO products'), [
      businessId,
      uploadedProduct.name,
      uploadedProduct.description,
      uploadedProduct.category,
      uploadedProduct.price,
      uploadedProduct.imageUrl,
      uploadedProduct.imagePublicId,
      true,
    ]);
  });

  test('keeps Cloudinary API secrets server-side and signs sorted upload parameters', () => {
    const signature = createSignature({ timestamp: 1234, public_id: 'image-id' }, 'secret');
    const expected = require('crypto')
      .createHash('sha1')
      .update('public_id=image-id&timestamp=1234secret')
      .digest('hex');
    expect(signature).toBe(expected);
  });
});
