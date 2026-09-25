'use strict';

const db = require('../db');
const cache = require('../cache');

const CACHE_TTL_AVG = parseInt(process.env.CACHE_TTL_RATINGS_AVG || '60', 10);
const CACHE_TTL_LIST = parseInt(process.env.CACHE_TTL_RATINGS_LIST || '30', 10);
const CACHE_ENABLED = process.env.NODE_ENV !== 'test' && String(process.env.CACHE_DISABLED || '').toLowerCase() !== '1';

async function listReviews(businessId) {
  if (!businessId) {
    return { ok: false, status: 400, message: 'businessId requerido' };
  }

  const cacheKey = `ratings:list:${businessId}`;
  if (CACHE_ENABLED) {
    const cached = await cache.get(cacheKey);
    if (cached) return { ok: true, status: 200, data: cached };
  }

  try {
    const { rows } = await db.query(
      'SELECT id, business_id, rating, review, created_at FROM ratings WHERE business_id = $1 ORDER BY created_at DESC LIMIT 10',
      [businessId]
    );
    const data = rows.map(r => ({ id: r.id, businessId: r.business_id, rating: r.rating, review: r.review, createdAt: r.created_at }));
    if (CACHE_ENABLED) await cache.set(cacheKey, data, CACHE_TTL_LIST);
    return { ok: true, status: 200, data };
  } catch (_error) {
    return { ok: false, status: 500, message: 'Error al obtener reseñas' };
  }
}

async function getAverageRating(businessId) {
  if (!businessId) {
    return { ok: false, status: 400, message: 'businessId requerido' };
  }

  const cacheKey = `ratings:avg:${businessId}`;
  if (CACHE_ENABLED) {
    const cached = await cache.get(cacheKey);
    if (cached) return { ok: true, status: 200, data: cached };
  }

  try {
    const { rows } = await db.query(
      'SELECT ROUND(AVG(rating)::numeric, 1) as avg_rating, COUNT(*) as count FROM ratings WHERE business_id = $1',
      [businessId]
    );
    const row = rows[0];
    const data = {
      businessId,
      averageRating: Number(row.avg_rating || 0),
      reviewCount: Number(row.count || 0),
    };
    if (CACHE_ENABLED) await cache.set(cacheKey, data, CACHE_TTL_AVG);
    return { ok: true, status: 200, data };
  } catch (_error) {
    return { ok: true, status: 200, data: { businessId, averageRating: 0, reviewCount: 0 } };
  }
}

async function createReview(businessId, rating, review) {
  if (!businessId || !rating) {
    return { ok: false, status: 400, message: 'businessId y rating son requeridos' };
  }

  if (rating < 1 || rating > 5) {
    return { ok: false, status: 400, message: 'rating debe estar entre 1 y 5' };
  }

  try {
    const { rows: negocioRows } = await db.query('SELECT 1 FROM businesses WHERE id = $1', [businessId]);
    if (!negocioRows.length) {
      return { ok: false, status: 404, message: 'Negocio no encontrado' };
    }

    const { rows } = await db.query(
      'INSERT INTO ratings (business_id, rating, review) VALUES ($1, $2, $3) RETURNING id, business_id, rating, review, created_at',
      [businessId, rating, review || '']
    );
    const r = rows[0];
    // Invalida caché de ratings y del listado de negocios (live ratings)
    try {
      await cache.del(`ratings:avg:${businessId}`);
      await cache.del(`ratings:list:${businessId}`);
      await cache.del(`biz:detail:${businessId}`);
      await cache.delByPrefix('biz:list:');
      await cache.del('biz:listAll:all');
      await cache.delByPrefix('biz:owner:');
    } catch {}
    return {
      ok: true,
      status: 201,
      data: { id: r.id, businessId: r.business_id, rating: r.rating, review: r.review, createdAt: r.created_at },
    };
  } catch (_error) {
    return { ok: false, status: 500, message: 'Error al crear reseña' };
  }
}

module.exports = { listReviews, getAverageRating, createReview };
