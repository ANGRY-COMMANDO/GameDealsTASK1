import { defineConfig, devices } from '@playwright/test'

/**
 * Сквозные проверки против запущенного приложения.
 * Локально: npm run dev, затем npx playwright test
 * Либо сразу собрать и поднять превью: npm run build && npm run preview
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  // CheapShark ограничивает частоту запросов, поэтому не устраиваем всплесков из тестов.
  workers: 2,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
})
