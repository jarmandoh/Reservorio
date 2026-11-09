'use strict';
// Seed de 83 negocios dummy para pruebas de modelado y funcionamiento.
// Uso: DATABASE_URL=... node scripts/seed-dummy.js
// Idempotente: borra los negocios con id prefijo 'dummy-' antes de insertar.

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const pool = new Pool({ connectionString: DATABASE_URL });

const CATEGORIES = [
  'Salud & Bienestar',
  'Belleza',
  'Fitness',
  'Educación',
  'Restaurantes',
  'Hogar',
  'Tecnología',
  'Moda',
  'Automotriz',
  'Mascotas',
  'Deportes',
  'Entretenimiento',
  'Fotografía',
  'Consultoría',
  'Limpieza',
];

const CITIES = [
  'Bogotá',
  'Medellín',
  'Cali',
  'Barranquilla',
  'Cartagena',
  'Bucaramanga',
  'Pereira',
  'Manizales',
  'Santa Marta',
  'Cúcuta',
  'Ibagué',
  'Villavicencio',
];

const ICONS = [
  'store',
  'spa',
  'content_cut',
  'fitness_center',
  'restaurant',
  'school',
  'pets',
  'directions_car',
  'photo_camera',
  'computer',
  'local_laundry_service',
  'medical_services',
  'home_repair_service',
  'shopping_bag',
  'emoji_events',
];

const GRADIENTS = [
  'linear-gradient(135deg,#005bbf,#1a73e8)',
  'linear-gradient(135deg,#7c3aed,#a78bfa)',
  'linear-gradient(135deg,#059669,#34d399)',
  'linear-gradient(135deg,#dc2626,#f87171)',
  'linear-gradient(135deg,#d97706,#fbbf24)',
  'linear-gradient(135deg,#0891b2,#22d3ee)',
];

const NAME_PARTS = ['La', 'El', 'Mi', 'Tu', 'Nuestro', 'Gran', 'Nuevo', 'Prime', 'Max', 'Pro'];
const NAME_NOUNS = [
  'Estilo',
  'Belleza',
  'Salud',
  'Fitness',
  'Sabor',
  'Corte',
  'Spa',
  'Tech',
  'Hogar',
  'Auto',
  'Mascota',
  'Foto',
  'Café',
  'Pizza',
  'Burger',
  'Yoga',
  'Pilates',
  'Dental',
  'Óptica',
  'Farmacia',
  'Gym',
  'Estudio',
  'Centro',
  'Consultorio',
  'Taller',
  'Boutique',
  'Tienda',
  'Market',
  'Express',
];
const NAME_SUFFIXES = [
  'Bogotá',
  'Medellín',
  'Premium',
  'Plus',
  'Studio',
  'Club',
  'House',
  'Lab',
  'Co',
  'Group',
  'Zone',
  'Point',
  'Hub',
  'Center',
];

const SERVICE_POOL = [
  'Corte de cabello',
  'Tinte',
  'Manicure',
  'Pedicure',
  'Masaje relajante',
  'Limpieza facial',
  'Consulta general',
  'Asesoría',
  'Reparación',
  'Mantenimiento',
  'Instalación',
  'Diagnóstico',
  'Clase grupal',
  'Clase personal',
  'Entrenamiento',
  'Domicilio',
  'Lavado',
  'Planchado',
  'Fotografía de producto',
  'Sesión de fotos',
  'Diseño web',
  'Soporte técnico',
  'Revisión',
  'Cambio de aceite',
  'Alineación',
  'Vacunación',
  'Baño y corte',
  'Paseo',
  'Guardería',
];

const TYPES = ['appointment', 'appointment', 'onsite_service', 'no_appointments', 'appointment', 'no_appointments'];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickN(arr, n) {
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}
function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Limpieza idempotente
    await client.query(`DELETE FROM services WHERE business_id LIKE 'dummy-%'`);
    await client.query(`DELETE FROM business_owners WHERE business_id LIKE 'dummy-%'`);
    await client.query(`DELETE FROM businesses WHERE id LIKE 'dummy-%'`);

    // Dueño dummy compartido
    const ownerEmail = 'dummy-owner@miveci.test';
    let ownerId;
    const ownerRes = await client.query('SELECT id FROM owners WHERE email = $1', [ownerEmail]);
    if (ownerRes.rows.length) {
      ownerId = ownerRes.rows[0].id;
    } else {
      const r = await client.query(
        'INSERT INTO owners (id, name, email, password_hash) VALUES ($1,$2,$3,$4) RETURNING id',
        ['dummy-owner', 'Dueño Dummy', ownerEmail, bcrypt.hashSync('1234', 10)]
      );
      ownerId = r.rows[0].id;
    }

    const pinHash = bcrypt.hashSync('1234', 10);
    const usedNames = new Set();

    for (let i = 1; i <= 83; i++) {
      let name;
      do {
        name = `${pick(NAME_PARTS)} ${pick(NAME_NOUNS)} ${pick(NAME_SUFFIXES)}`.trim();
      } while (usedNames.has(name));
      usedNames.add(name);

      const id = `dummy-${i}-${slugify(name).slice(0, 40)}`;
      const category = pick(CATEGORIES);
      const type = pick(TYPES);
      const city = pick(CITIES);
      const profession =
        type === 'onsite_service'
          ? pick(['electricista', 'ebanista', 'cerrajero', 'plomero', 'pintor', 'técnico'])
          : null;
      const rating = (3.5 + Math.random() * 1.5).toFixed(2);
      const reviews = randInt(0, 120);
      const tags = pickN(
        ['premium', 'online', 'domicilio', '24/7', 'express', 'certificado', 'garantía', 'nuevo'],
        3
      ).join(', ');
      const icon = pick(ICONS);
      const gradient = pick(GRADIENTS);
      const schedule =
        type === 'no_appointments' ? '' : Math.random() > 0.3 ? 'Lun-Vie 09:00-18:00' : 'Lun-Sáb 08:00-20:00';
      const phone = `+57${randInt(300, 320)}${randInt(1000000, 9999999)}`;
      const description = `${name} — ${category.toLowerCase()} en ${city}. ${type === 'onsite_service' ? 'Servicio a domicilio.' : type === 'no_appointments' ? 'Visítanos en tienda.' : 'Agenda tu cita online.'}`;

      await client.query(
        `INSERT INTO businesses (id, name, category, business_type, profession, description, location, rating, reviews, tags, gradient, icon, schedule, logo, phone, active, pin_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
        [
          id,
          name,
          category,
          type,
          profession,
          description,
          city,
          rating,
          reviews,
          tags,
          gradient,
          icon,
          schedule,
          '',
          phone,
          true,
          pinHash,
        ]
      );

      await client.query('INSERT INTO business_owners (business_id, owner_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [
        id,
        ownerId,
      ]);

      // Servicios (3 a 6 por negocio)
      const nSvc = randInt(3, 6);
      const svcs = pickN(SERVICE_POOL, nSvc);
      for (const svc of svcs) {
        await client.query(
          'INSERT INTO services (business_id, nombre, active) VALUES ($1,$2,true) ON CONFLICT (business_id, nombre) DO NOTHING',
          [id, svc]
        );
      }

      // Horarios disponibles (solo negocios con agenda): slots cada 30 min de 09:00 a 17:30
      if (type === 'appointment') {
        const slots = [];
        for (let h = 9; h < 18; h++) {
          for (const m of [0, 30]) {
            slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
          }
        }
        for (const slot of slots) {
          // ~20% ocupados para variedad
          const taken = Math.random() < 0.2;
          await client.query(
            `INSERT INTO reservations (business_id, franja, disponibilidad, cliente, telefono, servicio, notas)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [
              id,
              slot,
              taken ? 'Reservado' : 'Disponible',
              taken ? pick(['Ana García', 'Carlos López', 'María Pérez', 'Juan Rodríguez']) : '',
              taken ? `+57${randInt(300, 320)}${randInt(1000000, 9999999)}` : '',
              taken ? pick(svcs) : '',
              '',
            ]
          );
        }
      }

      if (i % 10 === 0) console.log(`insertados ${i}/83`);
    }

    await client.query('COMMIT');
    console.log('Seed completado: 83 negocios + servicios.');
    console.log('Dueño dummy: dummy-owner@miveci.test / PIN 1234 (para todos los negocios).');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('ERROR en seed:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
