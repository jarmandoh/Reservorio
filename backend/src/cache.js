'use strict';

/**
 * Caché distribuida con fallback en memoria.
 *
 * - Si REDIS_URL está definido intenta usar ioredis.
 * - Si no hay Redis o la conexión falla, usa Map en memoria con TTL.
 * - Pensado para listBusinesses / ratings average (60s) y rate-limit store.
 */

const logger = require('./logger');

const memoryStore = new Map();

let redis = null;
let redisReady = false;
let initAttempted = false;

function initRedis() {
  if (initAttempted) return redis;
  initAttempted = true;

  const url = String(process.env.REDIS_URL || '').trim();
  if (!url) return null;

  try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    const Redis = require('ioredis');
    redis = new Redis(url, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: false,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 1000);
      },
    });

    redis.on('connect', () => logger.info('[Redis] connecting...'));
    redis.on('ready', () => {
      redisReady = true;
      logger.info('[Redis] ready');
    });
    redis.on('error', err => logger.error('[Redis] error:', err.message));
    redis.on('close', () => {
      redisReady = false;
    });

    // Evita que un Redis caído bloquee el arranque: si no conecta en 2s, fallback a memoria.
    redis.on('error', () => {
      // noop, ya logueado
    });

    return redis;
  } catch (e) {
    logger.warn('[Redis] init failed, fallback a memoria:', e.message);
    redis = null;
    return null;
  }
}

// Inicialización perezosa pero también al importar si hay URL (para que el store de rate-limit lo vea pronto)
if (String(process.env.REDIS_URL || '').trim()) {
  initRedis();
}

function isRedisEnabled() {
  return !!(redis && redisReady);
}

function getRedisClient() {
  if (!redis) initRedis();
  return redis && redisReady ? redis : null;
}

// ── Memoria helpers ─────────────────────────────────────────────────────────
function memGet(key) {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  try {
    return JSON.parse(entry.value);
  } catch {
    return entry.value;
  }
}

function memSet(key, value, ttlSeconds) {
  const str = JSON.stringify(value);
  const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
  memoryStore.set(key, { value: str, expiresAt });
  if (ttlSeconds) {
    // Limpieza perezosa: no creamos timers por key para no saturar el event loop.
  }
}

function memDel(key) {
  memoryStore.delete(key);
}

function memDelByPrefix(prefix) {
  for (const k of [...memoryStore.keys()]) {
    if (k.startsWith(prefix)) memoryStore.delete(k);
  }
}

// ── API pública ──────────────────────────────────────────────────────────────

async function get(key) {
  const client = getRedisClient();
  if (client) {
    try {
      const raw = await client.get(key);
      if (raw === null) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    } catch (e) {
      logger.warn('[cache] Redis GET falló, fallback memoria:', e.message);
      return memGet(key);
    }
  }
  return memGet(key);
}

async function set(key, value, ttlSeconds = 60) {
  const client = getRedisClient();
  const payload = JSON.stringify(value);
  if (client) {
    try {
      if (ttlSeconds) {
        await client.set(key, payload, 'EX', ttlSeconds);
      } else {
        await client.set(key, payload);
      }
      return;
    } catch (e) {
      logger.warn('[cache] Redis SET falló, fallback memoria:', e.message);
    }
  }
  memSet(key, value, ttlSeconds);
}

async function del(key) {
  const client = getRedisClient();
  if (client) {
    try {
      await client.del(key);
    } catch (e) {
      logger.warn('[cache] Redis DEL falló:', e.message);
    }
  }
  memDel(key);
}

async function delByPrefix(prefix) {
  const client = getRedisClient();
  if (client) {
    try {
      // SCAN incremental para no bloquear Redis con KEYS
      let cursor = '0';
      do {
        // eslint-disable-next-line no-await-in-loop
        const [next, keys] = await client.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
        cursor = next;
        if (keys.length) {
          // eslint-disable-next-line no-await-in-loop
          await client.del(...keys);
        }
      } while (cursor !== '0');
    } catch (e) {
      logger.warn('[cache] Redis SCAN/DEL falló:', e.message);
    }
  }
  memDelByPrefix(prefix);
}

async function quit() {
  if (redis) {
    try {
      await redis.quit();
    } catch {
      try {
        redis.disconnect();
      } catch {}
    }
    redis = null;
    redisReady = false;
  }
  memoryStore.clear();
}

// Para tests: limpiar todo
function clearMemory() {
  memoryStore.clear();
}

module.exports = {
  get,
  set,
  del,
  delByPrefix,
  quit,
  clearMemory,
  isRedisEnabled,
  getRedisClient,
  initRedis,
  // expuesto para rate-limit store
  get client() {
    return getRedisClient();
  },
};
