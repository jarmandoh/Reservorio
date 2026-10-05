import { expect, test } from '@playwright/test';

test('publishes only canonical public pages in robots and sitemap', async ({ request }) => {
  const [robotsResponse, sitemapResponse] = await Promise.all([
    request.get('/robots.txt'),
    request.get('/sitemap.xml'),
  ]);

  expect(robotsResponse.ok()).toBe(true);
  expect(await robotsResponse.text()).toContain('Sitemap: https://reservorio.app/sitemap.xml');
  expect(sitemapResponse.ok()).toBe(true);
  const sitemap = await sitemapResponse.text();
  expect(sitemap).toContain('<loc>https://reservorio.app/</loc>');
  expect(sitemap).toContain('<loc>https://reservorio.app/privacy</loc>');
  expect(sitemap).not.toContain('TU-DOMINIO');
});

test('sets canonical metadata on public pages and noindexes booking routes', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://reservorio.app/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index, follow/);

  await page.goto('/privacy');
  await expect(page).toHaveTitle(/Política de privacidad/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://reservorio.app/privacy');

  await page.goto('/booking/business-1');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});
