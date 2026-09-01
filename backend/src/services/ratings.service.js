'use strict';

const db = require('../db');

async function listReviews(businessId) {
  if (!businessId) {
    return { ok: false, status: 400, message: 'businessId requerido' };
  }

  try {
    const { rows } = await db.query(
      'SELECT id, business_id, rating, review, created_at FROM ratings WHERE business_id = $1 ORDER BY created_at DESC LIMIT 10',
      [businessId]
    );
    return { ok: true, status: 200, data: rows.map(r => ({ id: r.id, businessId: r.business_id, rating: r.rating, review: r.review, createdAt: r.created_at })) };
  } catch (_error) {
    return { ok: false, status: 500, message: 'Error al obtener reseñas' };
  }
}

async function getAverageRating(businessId) {
  if (!businessId) {
    return { ok: false, status: 400, message: 'businessId requerido' };
  }

  try {
    const { rows } = await db.query(
      'SELECT ROUND(AVG(rating)::numeric, 1) as avg_rating, COUNT(*) as count FROM ratings WHERE business_id = $1',
      [businessId]
    );
    const row = rows[0];
    return {
      ok: true,
      status: 200,
      data: {
        businessId,
        averageRating: Number(row.avg_rating || 0),
        reviewCount: Number(row.count || 0),
      },
    };
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
    const { rows } = await db.query(
      'INSERT INTO ratings (business_id, rating, review) VALUES ($1, $2, $3) RETURNING id, business_id, rating, review, created_at',
      [businessId, rating, review || '']
    );
    const r = rows[0];
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
