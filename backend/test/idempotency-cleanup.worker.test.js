'use strict';

const mockQuery = jest.fn().mockResolvedValueOnce({ rowCount: 4 }).mockResolvedValueOnce({ rowCount: 2 });
jest.doMock('../src/db', () => ({ query: mockQuery }));
jest.doMock('../src/logger', () => ({ warn: jest.fn() }));

const { cleanupExpiredIdempotencyRecords } = require('../src/services/idempotency-cleanup.worker');

test('prunes completed requests after 30 days and webhook receipts after 90 days', async () => {
  await expect(cleanupExpiredIdempotencyRecords()).resolves.toEqual({ requests: 4, webhookEvents: 2 });

  expect(mockQuery).toHaveBeenNthCalledWith(1, expect.stringContaining("interval '1 day'"), [30]);
  expect(mockQuery).toHaveBeenNthCalledWith(2, expect.stringContaining('payment_webhook_events'), [90]);
});
