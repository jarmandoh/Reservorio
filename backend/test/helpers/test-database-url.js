'use strict';

function getTestDatabaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('TEST_DATABASE_URL debe apuntar a localhost/reservorio_test.');
  }

  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1'].includes(url.hostname) ||
    url.pathname !== '/reservorio_test'
  ) {
    throw new Error('Las pruebas de integración solo pueden usar localhost/reservorio_test.');
  }

  return value;
}

module.exports = { getTestDatabaseUrl };
