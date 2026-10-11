'use strict';

const { createHash, randomUUID } = require('crypto');
const express = require('express');
const { body, param } = require('express-validator');
const { requireBusinessAuth } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validation');
const db = require('../db');

const router = express.Router({ mergeParams: true });
const productImagePrefix = businessId => `reservorio/${businessId}/products/`;

function cloudinaryConfig() {
  const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME ?? '').trim();
  const apiKey = String(process.env.CLOUDINARY_API_KEY ?? '').trim();
  const apiSecret = String(process.env.CLOUDINARY_API_SECRET ?? '').trim();
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

function createSignature(params, apiSecret) {
  const serialized = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1').update(`${serialized}${apiSecret}`).digest('hex');
}

function validCloudinaryImage(imageUrl, cloudName) {
  try {
    const url = new URL(imageUrl);
    return (
      url.protocol === 'https:' &&
      url.hostname === 'res.cloudinary.com' &&
      url.pathname.startsWith(`/${cloudName}/image/upload/`)
    );
  } catch {
    return false;
  }
}

const businessIdValidator = [param('businessId').trim().notEmpty(), handleValidation];
const productIdValidator = [param('productId').isUUID(), handleValidation];
const productBodyValidators = [
  body('name').trim().notEmpty().isLength({ max: 120 }),
  body('description').optional().isString().isLength({ max: 1000 }),
  body('category').optional().isString().isLength({ max: 80 }),
  body('price').isFloat({ min: 0, max: 1000000000 }),
  body('imageUrl').isURL({ protocols: ['https'], require_protocol: true }),
  body('imagePublicId').trim().notEmpty().isLength({ max: 255 }),
  body('active').optional().isBoolean(),
  handleValidation,
];

router.get('/', businessIdValidator, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, business_id AS "businessId", name, description, category, price::float8 AS price,
              image_url AS "imageUrl", image_public_id AS "imagePublicId", active
         FROM products
        WHERE business_id = $1 AND active = true
        ORDER BY name`,
      [req.params.businessId]
    );
    res.json({ ok: true, data: rows });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.get('/manage', requireBusinessAuth, businessIdValidator, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, business_id AS "businessId", name, description, category, price::float8 AS price,
              image_url AS "imageUrl", image_public_id AS "imagePublicId", active
         FROM products
        WHERE business_id = $1
        ORDER BY created_at DESC`,
      [req.params.businessId]
    );
    res.json({ ok: true, data: rows });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.post('/image-signature', requireBusinessAuth, businessIdValidator, async (req, res) => {
  const config = cloudinaryConfig();
  if (!config) {
    return res.status(503).json({ ok: false, message: 'Falta configurar Cloudinary en el servidor.' });
  }

  const assetType = req.body?.assetType;
  if (assetType !== 'product' && assetType !== 'cover') {
    return res.status(400).json({ ok: false, message: 'Tipo de imagen no válido.' });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `reservorio/${req.params.businessId}/${assetType === 'cover' ? 'cover' : 'products'}`;
  const publicId = `${folder}/${randomUUID()}`;
  const params = { public_id: publicId, timestamp };
  res.json({
    ok: true,
    data: {
      apiKey: config.apiKey,
      cloudName: config.cloudName,
      publicId,
      signature: createSignature(params, config.apiSecret),
      timestamp,
    },
  });
});

router.post('/', requireBusinessAuth, businessIdValidator, productBodyValidators, async (req, res) => {
  const businessId = req.params.businessId;
  const { name, description = '', category = '', price, imageUrl, imagePublicId, active = true } = req.body;
  const config = cloudinaryConfig();
  if (
    !config ||
    !validCloudinaryImage(imageUrl, config.cloudName) ||
    !imagePublicId.startsWith(productImagePrefix(businessId))
  ) {
    return res
      .status(422)
      .json({ ok: false, message: 'La imagen debe provenir de una carga firmada de este negocio.' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO products (business_id, name, description, category, price, image_url, image_public_id, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, business_id AS "businessId", name, description, category, price::float8 AS price,
                 image_url AS "imageUrl", image_public_id AS "imagePublicId", active`,
      [businessId, name.trim(), description.trim(), category.trim(), Number(price), imageUrl, imagePublicId, active]
    );
    res.status(201).json({ ok: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.put(
  '/:productId',
  requireBusinessAuth,
  businessIdValidator,
  productIdValidator,
  productBodyValidators,
  async (req, res) => {
    const businessId = req.params.businessId;
    const { name, description = '', category = '', price, imageUrl, imagePublicId, active = true } = req.body;
    const config = cloudinaryConfig();
    if (
      !config ||
      !validCloudinaryImage(imageUrl, config.cloudName) ||
      !imagePublicId.startsWith(productImagePrefix(businessId))
    ) {
      return res
        .status(422)
        .json({ ok: false, message: 'La imagen debe provenir de una carga firmada de este negocio.' });
    }

    try {
      const { rows } = await db.query(
        `UPDATE products
          SET name = $1, description = $2, category = $3, price = $4,
              image_url = $5, image_public_id = $6, active = $7, updated_at = now()
        WHERE id = $8 AND business_id = $9
        RETURNING id, business_id AS "businessId", name, description, category, price::float8 AS price,
                  image_url AS "imageUrl", image_public_id AS "imagePublicId", active`,
        [
          name.trim(),
          description.trim(),
          category.trim(),
          Number(price),
          imageUrl,
          imagePublicId,
          active,
          req.params.productId,
          businessId,
        ]
      );
      if (!rows.length) return res.status(404).json({ ok: false, message: 'Producto no encontrado.' });
      res.json({ ok: true, data: rows[0] });
    } catch (error) {
      res.status(500).json({ ok: false, message: error.message });
    }
  }
);

router.delete('/:productId', requireBusinessAuth, businessIdValidator, productIdValidator, async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE products SET active = false, updated_at = now() WHERE id = $1 AND business_id = $2 AND active = true',
      [req.params.productId, req.params.businessId]
    );
    if (!result.rowCount) return res.status(404).json({ ok: false, message: 'Producto no encontrado.' });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

module.exports = { router, createSignature };
