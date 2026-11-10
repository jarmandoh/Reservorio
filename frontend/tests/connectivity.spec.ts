import { expect, test } from '@playwright/test';

test('shows offline status after disconnection and clears it after reconnection', async ({ page }) => {
  await page.goto('/payment/cancel');
  await expect(page.getByRole('heading', { name: 'La reserva sigue creada' })).toBeVisible();

  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await expect(page.locator('.offline-banner')).toContainText('Sin conexión');

  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.locator('.offline-banner')).toHaveCount(0);
});
