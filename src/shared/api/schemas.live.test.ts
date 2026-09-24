import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fetchDealsPage, fetchGameDetails, fetchStores } from './client'

/**
 * Проверка zod-схем на реальном ответе CheapShark.
 * Запуск: LIVE_API=1 npx vitest run src/shared/api/schemas.live.test.ts
 *
 * В браузере User-Agent подставляет сам браузер, а Node обязан указать его явно —
 * CheapShark отклоняет «безымянные» запросы (HTTP 400).
 */
beforeAll(() => {
  const original = globalThis.fetch
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    original(input, {
      ...init,
      headers: {
        ...(init?.headers as Record<string, string>),
        'User-Agent': 'GameDeals-LiveTests/1.0',
      },
    }),
  )
})

describe.skipIf(!process.env.LIVE_API)('CheapShark API (live)', () => {
  it('возвращает магазины', async () => {
    const stores = await fetchStores()
    expect(stores.length).toBeGreaterThan(5)
    expect(stores.some((store) => store.storeName === 'Steam')).toBe(true)
  })

  it('возвращает страницу скидок и счётчик страниц', async () => {
    const page = await fetchDealsPage({ pageNumber: 1, pageSize: 5, sortBy: 'Savings', desc: true })
    expect(page.deals.length).toBeGreaterThan(0)
    expect(page.totalPages).toBeGreaterThan(1)
    for (const deal of page.deals) {
      expect(typeof deal.salePrice).toBe('number')
      expect(deal.title.length).toBeGreaterThan(0)
    }
  })

  it('фильтрует по названию (pageNumber не ломает поиск — обход особенности API)', async () => {
    const page = await fetchDealsPage({ pageNumber: 1, pageSize: 5, title: 'witcher' })
    expect(page.deals.length).toBeGreaterThan(0)
    expect(page.deals.every((deal) => /witcher/i.test(deal.title))).toBe(true)
  })

  it('возвращает детали игры', async () => {
    const details = await fetchGameDetails('612')
    expect(details.info.title.length).toBeGreaterThan(0)
    expect(details.deals.length).toBeGreaterThan(0)
  })
})
