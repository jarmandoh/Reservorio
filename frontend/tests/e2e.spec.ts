/// <reference types="node" />
import { test, expect, type APIRequestContext } from '@playwright/test';

const API_BASE = process.env['PLAYWRIGHT_API_URL'] || 'http://127.0.0.1:3000';
const ADMIN_PIN = process.env['PLAYWRIGHT_ADMIN_PIN'] || '1234';
const businessPin = process.env['PLAYWRIGHT_BUSINESS_PIN'] || '1234';
const newServiceName = `prueba-servicio-${Date.now()}`;
const setupServiceName = `servicio-e2e-${Date.now()}`;
const setupSlotTime = `10:00-${Date.now()}`;

let businessId = process.env['PLAYWRIGHT_BUSINESS_ID'] || '';

async function getAdminToken(request: APIRequestContext) {
  const response = await request.post(`${API_BASE}/api/auth/admin`, {
    data: { pin: ADMIN_PIN },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return body.data.token as string;
}

async function createBusinessIfNeeded(request: APIRequestContext, adminToken: string) {
  if (businessId) return businessId;

  const name = `e2e-negocio-${Date.now()}`;
  const response = await request.post(`${API_BASE}/api/businesses`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: {
      name,
      category: 'Belleza',
      pin: businessPin,
    },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  businessId = body.data.id;
  return businessId;
}

async function ensureServiceExists(request: APIRequestContext, adminToken: string) {
  const response = await request.post(`${API_BASE}/api/businesses/${businessId}/services`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { nombre: setupServiceName },
  });
  if (!response.ok()) {
    const body = await response.json().catch(() => ({}));
    expect(body.message).toContain('Servicio ya existe');
  }
}

async function ensureAvailableSlot(request: APIRequestContext, adminToken: string) {
  const response = await request.post(`${API_BASE}/api/businesses/${businessId}/reservations`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: {
      franja: setupSlotTime,
      cliente: 'E2E Slot',
      telefono: '+1234567890',
      servicio: setupServiceName,
      notas: 'Slot disponible de prueba',
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  const reservationId = body.data.id;

  const updateResponse = await request.put(`${API_BASE}/api/reservations/${reservationId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: {
      disponibilidad: 'Disponible',
      notas: 'Slot creado para E2E',
    },
  });

  expect(updateResponse.ok()).toBeTruthy();
}

const E2E_CUSTOMER_EMAIL = `e2e-${Date.now()}@reservorio.test`;
const E2E_CUSTOMER_PHONE = '+573001234567';
const E2E_CUSTOMER_NAME = 'E2E Usuario';

async function ensureE2ECustomer(request: APIRequestContext): Promise<string> {
  // Crea cliente si no existe (ignora 409) y loguea para obtener JWT
  await request.post(`${API_BASE}/api/customers`, {
    data: {
      name: E2E_CUSTOMER_NAME,
      email: E2E_CUSTOMER_EMAIL,
      phone: E2E_CUSTOMER_PHONE,
      dataConsent: true,
      marketingConsent: false,
    },
  });

  const loginRes = await request.post(`${API_BASE}/api/auth/customer/login`, {
    data: { email: E2E_CUSTOMER_EMAIL, phone: E2E_CUSTOMER_PHONE },
  });
  expect(loginRes.ok()).toBeTruthy();
  const body = await loginRes.json();
  return body.data.token as string;
}

async function loginCustomerOnPage(page: import('@playwright/test').Page, token: string) {
  await page.goto('/');
  await page.evaluate(t => localStorage.setItem('reservorio_customer_jwt', t), token);
}

test.describe.configure({ mode: 'serial' });

let customerToken = '';

test.beforeAll(async ({ request }) => {
  const adminToken = await getAdminToken(request);
  await createBusinessIfNeeded(request, adminToken);
  await ensureServiceExists(request, adminToken);
  await ensureAvailableSlot(request, adminToken);
  customerToken = await ensureE2ECustomer(request);
});

test.describe('Reserva y administración', () => {
  test('flujo de reserva muestra validación y confirma reserva', async ({ page }) => {
    await loginCustomerOnPage(page, customerToken);
    await page.goto(`/booking/${businessId}`);
    await expect(page.getByRole('heading', { name: 'Elige tu servicio' })).toBeVisible();

    await expect(page.locator('text=No se pudieron cargar los servicios')).toHaveCount(0, { timeout: 20000 });
    const serviceCard = page.locator('button.rounded-2xl:has-text("Disponible")').first();
    await expect(serviceCard).toBeVisible({ timeout: 20000 });

    await serviceCard.click();
    await expect(page.getByRole('button', { name: 'Continuar al horario' })).toBeEnabled();
    await page.getByRole('button', { name: 'Continuar al horario' }).click();

    const slotButton = page.locator('button.slot-chip:not(.taken)').first();
    await expect(slotButton).toBeVisible({ timeout: 20000 });
    await slotButton.click();

    await expect(page.getByRole('button', { name: 'Continuar con tus datos' })).toBeEnabled();
    await page.getByRole('button', { name: 'Continuar con tus datos' }).click();

    await expect(page.getByLabel('Tu nombre')).toBeVisible();
    await page.fill('#cliente', 'Ana Garcia');
    await page.fill('#telefono', 'invalid');
    await expect(page.locator('text=7-15 dígitos')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirmar reserva' })).toBeDisabled();

    await page.check('#dataConsent');
    await page.fill('#telefono', '+573001234567');
    await expect(page.getByRole('button', { name: 'Confirmar reserva' })).toBeEnabled();
    await page.getByRole('button', { name: 'Confirmar reserva' }).click();
    await expect(page.getByRole('heading', { name: 'Reserva registrada' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Estado de la reserva')).toBeVisible({ timeout: 10000 });
  });

  test('flujo de administración de negocio permite login y agregar servicio', async ({ page }) => {
    await page.goto(`/business/${businessId}/login`);
    await expect(page.getByLabel('PIN de acceso')).toBeVisible();

    await page.fill('input[formcontrolname="pin"]', businessPin);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(new RegExp(`/business/${businessId}/admin`));

    await page.getByRole('button', { name: 'Servicios' }).click();
    await expect(page.locator('input[formcontrolname="nombre"]')).toBeVisible();

    await page.fill('input[formcontrolname="nombre"]', 'a');
    await expect(page.getByRole('button', { name: 'Agregar' })).toBeDisabled();

    await page.fill('input[formcontrolname="nombre"]', newServiceName);
    await page.getByRole('button', { name: 'Agregar' }).click();
    await expect(page.locator(`text=${newServiceName}`)).toBeVisible({ timeout: 10000 });
  });

  test('flujo de administración actualiza estado de reserva', async ({ page, request }) => {
    const reservationResponse = await request.post(`${API_BASE}/api/businesses/${businessId}/reservations`, {
      headers: { Authorization: `Bearer ${customerToken}` },
      data: {
        franja: '10:00',
        cliente: 'E2E Usuario',
        telefono: '+573001234567',
        servicio: 'Corte',
        notas: 'Reserva de prueba',
      },
    });
    expect(reservationResponse.ok()).toBeTruthy();

    await page.goto(`/business/${businessId}/login`);
    await page.fill('input[formcontrolname="pin"]', businessPin);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(new RegExp(`/business/${businessId}/admin`));

    await page.getByRole('button', { name: 'Reservas' }).click();
    await expect(page.getByRole('cell', { name: 'E2E Usuario' })).toBeVisible({ timeout: 10000 });

    await page
      .getByRole('row', { name: /E2E Usuario/ })
      .first()
      .getByRole('button', { name: 'Editar' })
      .click();
    await expect(page.locator('text=Actualizar reserva')).toBeVisible();

    await page.locator('.fixed select.form-select').selectOption('Confirmado');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.locator('text=Estado actualizado')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('cell', { name: 'Confirmado' })).toBeVisible();
  });

  test('flujo de administración agrega y elimina un servicio', async ({ page }) => {
    const deleteServiceName = `borrar-servicio-${Date.now()}`;

    await page.goto(`/business/${businessId}/login`);
    await page.fill('input[formcontrolname="pin"]', businessPin);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(new RegExp(`/business/${businessId}/admin`));

    await page.getByRole('button', { name: 'Servicios' }).click();
    await expect(page.locator('input[formcontrolname="nombre"]')).toBeVisible();

    await page.fill('input[formcontrolname="nombre"]', deleteServiceName);
    await page.getByRole('button', { name: 'Agregar' }).click();
    await expect(page.locator(`text=${deleteServiceName}`)).toBeVisible({ timeout: 10000 });

    const serviceRow = page.locator('.card', { hasText: deleteServiceName });
    await expect(serviceRow).toBeVisible();

    await serviceRow.getByRole('button').click();
    await expect(page.locator(`text=${deleteServiceName}`)).toHaveCount(0, { timeout: 10000 });
  });
});
