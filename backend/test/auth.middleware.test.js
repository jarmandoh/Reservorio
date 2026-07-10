const auth = require('../src/middleware/auth');

describe('auth middleware exports', () => {
  test('exports owner and admin-or-owner middlewares as functions', () => {
    expect(typeof auth.requireAdmin).toBe('function');
    expect(typeof auth.requireOwnerAuth).toBe('function');
    expect(typeof auth.requireAdminOrOwner).toBe('function');
  });
});
