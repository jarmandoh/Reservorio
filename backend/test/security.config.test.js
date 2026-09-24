'use strict';

const { validateRuntimeConfig } = require('../src/index');

describe('Runtime security validation', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('accepts a safe production configuration', () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/reservorio';
    process.env.JWT_SECRET = 'a_very_long_and_secure_production_secret_123';
    process.env.CORS_ORIGINS = 'https://app.example.com';
    process.env.FRONTEND_URL = 'https://app.example.com';
    process.env.ADMIN_PIN = 'clave-segura-9876';

    expect(() => validateRuntimeConfig()).not.toThrow();
  });

  test('throws when JWT secret is too weak in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/reservorio';
    process.env.JWT_SECRET = 'short';
    process.env.CORS_ORIGINS = 'https://app.example.com';
    process.env.ADMIN_PIN = 'clave-segura-9876';

    expect(() => validateRuntimeConfig()).toThrow(/JWT_SECRET/i);
  });

  test('throws when ADMIN_PIN is missing or weak in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/reservorio';
    process.env.JWT_SECRET = 'a_very_long_and_secure_production_secret_123';
    process.env.CORS_ORIGINS = 'https://app.example.com';
    process.env.ADMIN_PIN = '1234';

    expect(() => validateRuntimeConfig()).toThrow(/ADMIN_PIN/i);
  });

  test('throws when CORS origins are empty in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/reservorio';
    process.env.JWT_SECRET = 'a_very_long_and_secure_production_secret_123';
    process.env.CORS_ORIGINS = '';
    process.env.ADMIN_PIN = 'clave-segura-9876';

    expect(() => validateRuntimeConfig()).toThrow(/CORS_ORIGINS/i);
  });

  test('throws when FRONTEND_URL is missing or not https in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/reservorio';
    process.env.JWT_SECRET = 'a_very_long_and_secure_production_secret_123';
    process.env.CORS_ORIGINS = 'https://app.example.com';
    process.env.ADMIN_PIN = 'clave-segura-9876';

    expect(() => validateRuntimeConfig()).toThrow(/FRONTEND_URL/i);

    process.env.FRONTEND_URL = 'http://app.example.com';
    expect(() => validateRuntimeConfig()).toThrow(/FRONTEND_URL/i);
  });
});
