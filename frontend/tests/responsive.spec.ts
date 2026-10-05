import { expect, test } from '@playwright/test';

test('keeps the home search and primary navigation usable on a mobile viewport', async ({ page }) => {
  await page.route('**/api/businesses*', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, data: [] }),
    })
  );

  await page.goto('/');

  await expect(page.getByRole('heading', { name: /Reserva en segundos/ })).toBeVisible();
  await expect(page.getByPlaceholder('Busca por nombre, servicio o categoría…')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mi cuenta' })).toBeVisible();
});
