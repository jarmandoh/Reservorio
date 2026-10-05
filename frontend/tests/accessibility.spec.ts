import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function expectAccessible(page: Page, route: string): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(route);
  await expect(page.locator('#main-content > div')).toHaveCSS('opacity', '1');
  await expectNoAxeViolations(page);
}

async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(
    results.violations.map(({ id, impact, nodes }) => ({
      id,
      impact,
      elements: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
    }))
  ).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    const data =
      path === '/api/businesses'
        ? [
            {
              id: 'a11y-business',
              name: 'Negocio accesible',
              category: 'Belleza',
              description: 'Servicio para prueba automatizada de accesibilidad.',
              location: 'Bogotá',
              rating: 4.8,
              reviews: 12,
              tags: ['Cita'],
              available: 2,
              total: 3,
              routePath: '/booking/a11y-business',
              gradient: 'linear-gradient(135deg, #005bbf, #1a73e8)',
              icon: 'event',
            },
          ]
        : [];
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, data }),
    });
  });
});

test('home has no WCAG 2.1 A/AA axe violations', async ({ page }) => {
  await expectAccessible(page, '/');
  await expect(page.getByRole('link', { name: /Negocio accesible/ })).toBeVisible();
});

test('booking has no WCAG 2.1 A/AA axe violations', async ({ page }) => {
  await expectAccessible(page, '/booking/a11y-business');
});

test('customer login has no WCAG 2.1 A/AA axe violations', async ({ page }) => {
  await expectAccessible(page, '/customer/login');
});

test('admin login has no WCAG 2.1 A/AA axe violations', async ({ page }) => {
  await expectAccessible(page, '/jh-login');
});

test('business login has no WCAG 2.1 A/AA axe violations', async ({ page }) => {
  await expectAccessible(page, '/business/a11y-business/login');
});

test('account creation has no WCAG 2.1 A/AA axe violations', async ({ page }) => {
  await expectAccessible(page, '/account/create');
});

test('invalid login fields expose and associate their validation messages', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/customer/login');

  const email = page.getByLabel('Correo electrónico');
  await email.fill('no-es-un-correo');
  await email.press('Tab');
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await expect(email).toHaveAttribute('aria-describedby', 'email-error');
  await expect(page.getByText('Introduce un correo electrónico válido.')).toBeVisible();

  const phone = page.getByLabel('Teléfono');
  await phone.fill('123');
  await phone.press('Tab');
  await expect(phone).toHaveAttribute('aria-invalid', 'true');
  await expect(phone).toHaveAttribute('aria-describedby', 'phone-error');
  await expectNoAxeViolations(page);
});

test('admin panel has no WCAG 2.1 A/AA axe violations', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('reservorio_unlocked', '1'));
  await expectAccessible(page, '/admin');
});

test('payment cancellation has no WCAG 2.1 A/AA axe violations', async ({ page }) => {
  await expectAccessible(page, '/payment/cancel?bookingId=a11y-booking');
});

test('keyboard users can skip directly to the main content', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: 'Saltar al contenido principal' });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  await expect(skipLink).toHaveCSS('outline-style', 'solid');
  await expect(skipLink).toHaveCSS('outline-color', 'rgb(255, 191, 0)');
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
});

test('account popover opens and closes by keyboard while restoring focus', async ({ page }) => {
  await page.goto('/');
  const accountButton = page.getByRole('button', { name: 'Mi cuenta' });
  await accountButton.focus();
  await page.keyboard.press('Enter');
  await expect(accountButton).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: /Usuario Historial y reservas/ })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(accountButton).toHaveAttribute('aria-expanded', 'false');
  await expect(accountButton).toBeFocused();
});

test('home and booking reflow at 200% and 320px widths without horizontal page scrolling', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [640, 320]) {
    await page.setViewportSize({ width, height: 800 });
    for (const route of ['/', '/booking/a11y-business']) {
      await page.goto(route);
      await expect(page.locator('#main-content > div')).toHaveCSS('opacity', '1');
      const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(pageWidth, `${route} should fit a ${width}px layout viewport`).toBeLessThanOrEqual(width);
    }
  }
});

test('reduced-motion preference disables nonessential animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const animationDuration = await page.locator('body').evaluate(body => {
    const probe = document.createElement('div');
    probe.className = 'skeleton';
    body.append(probe);
    const duration = getComputedStyle(probe).animationDuration;
    probe.remove();
    return duration;
  });
  expect(animationDuration).toBe('1e-05s');
});
