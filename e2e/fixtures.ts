import { test as base, expect } from '@playwright/test'
import { installApiMocks } from './mock-api'

/**
 * По умолчанию тесты работают на моках CheapShark: быстро, детерминированно и без риска
 * попасть под ограничение частоты запросов.
 * Живой режим: E2E_LIVE=1 npx playwright test
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    if (!process.env.E2E_LIVE) await installApiMocks(page)
    await use(page)
  },
})

export { expect }
export type { Page } from '@playwright/test'
