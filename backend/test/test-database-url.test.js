'use strict';

const { getTestDatabaseUrl } = require('./helpers/test-database-url');

describe('TEST_DATABASE_URL safety', () => {
  test('accepts the dedicated local PostgreSQL database', () => {
    const url = 'postgres://reservorio_test:secret@127.0.0.1:5432/reservorio_test';

    expect(getTestDatabaseUrl(url)).toBe(url);
  });

  test.each([
    'postgres://postgres:secret@project.supabase.co:5432/postgres',
    'postgres://user:secret@localhost:5432/reservorio',
    'not-a-postgres-url',
  ])('rejects unsafe test database URL: %s', url => {
    expect(() => getTestDatabaseUrl(url)).toThrow();
  });
});
