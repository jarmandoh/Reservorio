import { defineConfig, devices } from '@playwright/test';

const playwrightPort = Number(process.env.PLAYWRIGHT_PORT || 4201);

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  webServer: process.env.PLAYWRIGHT_SKIP_SERVER
    ? []
    : [
        {
          command: 'node src/index.js',
          cwd: '../backend',
          port: 3000,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
        {
          command: 'node scripts/serve-dist.mjs',
          port: playwrightPort,
          env: {
            ...process.env,
            PORT: String(playwrightPort),
            API_PROXY_TARGET: process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:3000',
          },
          reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === '1',
          timeout: 120_000,
        },
      ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${playwrightPort}`,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: 'e2e.spec.ts',
    },
    {
      name: 'webkit-smoke',
      use: { ...devices['Desktop Safari'] },
      testMatch: 'browser-smoke.spec.ts',
    },
    {
      name: 'chromium-smoke',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['payment-route.spec.ts', 'connectivity.spec.ts', 'service-worker.spec.ts', 'seo-release.spec.ts'],
    },
    {
      name: 'chromium-a11y',
      use: { ...devices['Desktop Chrome'] },
      testMatch: 'accessibility.spec.ts',
    },
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 7'] },
      testMatch: 'responsive.spec.ts',
    },
  ],
});
