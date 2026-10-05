import { expect, test } from '@playwright/test';

test('serves the cached application shell offline and recovers on reconnection', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.locator('app-root')).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.register('/ngsw-worker.js'));
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.reload();
  await expect(page.locator('app-root')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const indexUrl = new URL('/index.html', location.origin).href;
        for (const cacheName of await caches.keys()) {
          const cache = await caches.open(cacheName);
          if (await cache.match(indexUrl)) return true;
        }
        return false;
      })
    )
    .toBe(true);

  await context.setOffline(true);
  await page.reload();

  await expect(page.locator('app-root')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Sin conexión');

  await context.setOffline(false);
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('clears an expired session when the API responds with 401', async ({ page }) => {
  await page.addInitScript(() => {
    const payload = btoa(JSON.stringify({ role: 'customer', exp: Math.floor(Date.now() / 1000) + 600 }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    localStorage.setItem('reservorio_customer_jwt', `header.${payload}.signature`);
  });
  await page.route('**/api/businesses**', route =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Token expirado' }),
    })
  );

  const request = page.waitForRequest(req => req.url().includes('/api/businesses') && req.method() === 'GET');
  await page.goto('/');
  expect((await request).headers().authorization).toMatch(/^Bearer /);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('reservorio_customer_jwt'))).toBeNull();
  await expect(page.getByText('Token expirado')).toBeVisible();
});
