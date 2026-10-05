import { expect, test } from '@playwright/test';

test('loads the HTML document in WebKit', async ({ page }) => {
  await page.goto('/payment/cancel');
  await expect(page).toHaveTitle(/Reservorio/);
});
