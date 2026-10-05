import { expect, test } from '@playwright/test';

test('payment cancellation explains the pending reservation and includes its ID', async ({ page }) => {
  await page.goto('/payment/cancel?bookingId=e2e-cancel-123&providerId=business-1');

  await expect(page.getByRole('heading', { name: 'La reserva sigue creada' })).toBeVisible();
  await expect(page.getByText('e2e-cancel-123')).toBeVisible();
  await expect(page.getByText('Pendiente', { exact: true })).toBeVisible();
});
