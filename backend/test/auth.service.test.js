'use strict';

process.env.JWT_SECRET = 'test-secret';
process.env.ADMIN_PIN = '1234';

const authService = require('../src/services/auth.service');

describe('AuthService', () => {
  test('authenticateAdmin rejects an invalid pin', async () => {
    const result = await authService.authenticateAdmin('wrong');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('PIN incorrecto');
  });

  test('authenticateAdmin returns a token for a valid pin', async () => {
    const result = await authService.authenticateAdmin('1234');
    expect(result.ok).toBe(true);
    expect(result.data?.token).toBeDefined();
  });
});
