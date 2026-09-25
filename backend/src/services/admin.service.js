'use strict';

const db = require('../db');
const { listBookings } = require('./bookings.service');
const { listCustomers } = require('./customers.service');
const { listPayments } = require('./payments.service');
const { countViews } = require('./analytics.service');

const FUNNEL_DAYS = 30;

function firstOfWindow(entity) {
  const cutoff = Date.now() - FUNNEL_DAYS * 24 * 60 * 60 * 1000;
  const createdAt = entity.createdAt ? new Date(entity.createdAt).getTime() : NaN;
  return Number.isFinite(createdAt) && createdAt >= cutoff;
}

async function getMarketplaceStats() {
  const [bookingsResult, customersResult, paymentsResult] = await Promise.all([
    listBookings(),
    listCustomers(),
    listPayments({}),
  ]);

  const bookings = bookingsResult.ok ? bookingsResult.data : [];
  const customers = (customersResult.ok ? customersResult.data : []).length;
  const payments = paymentsResult.ok ? paymentsResult.data : [];
  const revenue = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount || 0), 0);

  let dbStats = null;
  if (process.env.DATABASE_URL) {
    try {
      const { rows } = await db.query(`SELECT
        (SELECT COUNT(*)::int FROM businesses) AS businesses,
        (SELECT COUNT(*)::int FROM businesses WHERE active = true) AS active_businesses,
        (SELECT COUNT(*)::int FROM businesses WHERE verified = true) AS verified_businesses,
        (SELECT COUNT(*)::int FROM bookings) AS bookings,
        (SELECT COUNT(*)::int FROM bookings WHERE status = 'confirmed') AS confirmed_bookings,
        (SELECT COUNT(*)::int FROM reservations) AS reservations,
        (SELECT COUNT(*)::int FROM ratings) AS reviews,
        (SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0)::float8 FROM ratings) AS average_rating,
        (SELECT COUNT(*)::int FROM bookings WHERE created_at >= now() - interval '${FUNNEL_DAYS} days') AS funnel_bookings,
        (SELECT COUNT(*)::int FROM payments WHERE status = 'paid' AND created_at >= now() - interval '${FUNNEL_DAYS} days') AS funnel_paid`);
      dbStats = rows[0];
    } catch (_error) {
      dbStats = null;
    }
  }

  const views = await countViews({ days: FUNNEL_DAYS });
  const funnelBookings = dbStats?.funnel_bookings ?? bookings.filter(firstOfWindow).length;
  const funnelPaid = dbStats?.funnel_paid ?? payments.filter(p => p.status === 'paid' && firstOfWindow(p)).length;

  return {
    ok: true,
    status: 200,
    data: {
      businesses: dbStats?.businesses ?? 0,
      activeBusinesses: dbStats?.active_businesses ?? 0,
      verifiedBusinesses: dbStats?.verified_businesses ?? 0,
      customers,
      bookings: dbStats?.bookings ?? bookings.length,
      confirmedBookings: dbStats?.confirmed_bookings ?? bookings.filter(b => b.status === 'confirmed').length,
      reservations: dbStats?.reservations ?? 0,
      payments: payments.length,
      paidPayments: payments.filter(p => p.status === 'paid').length,
      pendingPayments: payments.filter(p => p.status === 'pending').length,
      revenue,
      reviews: dbStats?.reviews ?? 0,
      averageRating: dbStats?.average_rating ?? 0,
      funnel: {
        views,
        bookings: funnelBookings,
        paid: funnelPaid,
        days: FUNNEL_DAYS,
      },
    },
  };
}

async function listAllReviews() {
  if (!process.env.DATABASE_URL) {
    return { ok: true, status: 200, data: [] };
  }

  try {
    const { rows } = await db.query(
      `SELECT r.id, r.business_id, b.name AS business_name, r.rating, r.review, r.created_at
       FROM ratings r
       LEFT JOIN businesses b ON b.id = r.business_id
       ORDER BY r.created_at DESC
       LIMIT 200`
    );
    return {
      ok: true,
      status: 200,
      data: rows.map(r => ({
        id: r.id,
        businessId: r.business_id,
        businessName: r.business_name ?? '',
        rating: r.rating,
        review: r.review,
        createdAt: r.created_at,
      })),
    };
  } catch (_error) {
    return { ok: false, status: 500, message: 'Error al obtener reseñas' };
  }
}

async function deleteReview(id) {
  const cleanId = Number(id);
  if (!Number.isFinite(cleanId)) {
    return { ok: false, status: 400, message: 'id requerido' };
  }

  if (!process.env.DATABASE_URL) {
    return { ok: false, status: 400, message: 'Requiere base de datos' };
  }

  try {
    const { rows } = await db.query('DELETE FROM ratings WHERE id = $1 RETURNING id', [cleanId]);
    if (!rows.length) {
      return { ok: false, status: 404, message: 'Reseña no encontrada' };
    }
    return { ok: true, status: 200, data: { id: rows[0].id } };
  } catch (_error) {
    return { ok: false, status: 500, message: 'Error al eliminar reseña' };
  }
}

async function listAllServices() {
  if (!process.env.DATABASE_URL) {
    return { ok: true, status: 200, data: [] };
  }

  try {
    const { rows } = await db.query(
      `SELECT s.id, s.business_id, b.name AS business_name, s.nombre, s.active, s.created_at
       FROM services s
       LEFT JOIN businesses b ON b.id = s.business_id
       ORDER BY s.created_at DESC`
    );
    return {
      ok: true,
      status: 200,
      data: rows.map(r => ({
        id: r.id,
        businessId: r.business_id,
        businessName: r.business_name ?? '',
        nombre: r.nombre,
        active: r.active,
        createdAt: r.created_at,
      })),
    };
  } catch (_error) {
    return { ok: false, status: 500, message: 'Error al obtener servicios' };
  }
}

async function deleteService(id) {
  const cleanId = Number(id);
  if (!Number.isFinite(cleanId)) {
    return { ok: false, status: 400, message: 'id requerido' };
  }

  if (!process.env.DATABASE_URL) {
    return { ok: false, status: 400, message: 'Requiere base de datos' };
  }

  try {
    const { rows } = await db.query('DELETE FROM services WHERE id = $1 RETURNING id', [cleanId]);
    if (!rows.length) {
      return { ok: false, status: 404, message: 'Servicio no encontrado' };
    }
    return { ok: true, status: 200, data: { id: rows[0].id } };
  } catch (_error) {
    return { ok: false, status: 500, message: 'Error al eliminar servicio' };
  }
}

async function listAdminPayments(filters = {}) {
  const status = String(filters.status ?? '').trim();
  const result = await listPayments({});
  if (!result.ok) {
    return result;
  }

  let data = result.data;
  if (status) {
    data = data.filter(p => p.status === status);
  }

  return { ok: true, status: 200, data };
}

module.exports = {
  getMarketplaceStats,
  listAllReviews,
  deleteReview,
  listAllServices,
  deleteService,
  listAdminPayments,
};
