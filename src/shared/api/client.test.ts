import { afterEach, describe, expect, it, vi } from 'vitest'
import { isRateLimited } from '@/shared/lib/rateLimit'
import {
  dealTargetUrl,
  fetchDealsPage,
  fetchGameDetails,
  fetchStores,
  isSteamAppId,
  resetApiGateForTests,
  steamStoreUrl,
} from './client'

describe('dealTargetUrl', () => {
  it('ведёт напрямую в Steam, если известен appID', () => {
    expect(dealTargetUrl({ dealID: 'abc', storeID: '1', steamAppID: '292030' })).toBe(
      'https://store.steampowered.com/app/292030/',
    )
  })

  it('для Steam без appID использует редирект CheapShark', () => {
    expect(dealTargetUrl({ dealID: 'abc', storeID: '1', steamAppID: null })).toBe(
      'https://www.cheapshark.com/redirect?dealID=abc',
    )
  })

  it('для остальных магазинов использует редирект CheapShark', () => {
    expect(dealTargetUrl({ dealID: 'xyz', storeID: '7', steamAppID: '292030' })).toBe(
      'https://www.cheapshark.com/redirect?dealID=xyz',
    )
  })

  it('кодирует сырой dealID с пробелами и слэшами', () => {
    expect(dealTargetUrl({ dealID: 'a b/c', storeID: '7' })).toBe(
      'https://www.cheapshark.com/redirect?dealID=a%20b%2Fc',
    )
  })

  it('не кодирует повторно dealID, который CheapShark уже отдал закодированным', () => {
    const dealID = 'gSUqW8642cJRgfC%2Btx6RCC9Dce2apqZVYpn3jk4KtzU%3D'
    expect(dealTargetUrl({ dealID, storeID: '7' })).toBe(
      `https://www.cheapshark.com/redirect?dealID=${dealID}`,
    )
  })
})

describe('isSteamAppId', () => {
  it('принимает только числовые идентификаторы', () => {
    expect(isSteamAppId('292030')).toBe(true)
    expect(isSteamAppId('abc')).toBe(false)
    expect(isSteamAppId(null)).toBe(false)
    expect(isSteamAppId(undefined)).toBe(false)
  })
})

describe('steamStoreUrl', () => {
  it('собирает ссылку на магазин Steam', () => {
    expect(steamStoreUrl('570')).toBe('https://store.steampowered.com/app/570/')
  })
})

async function requestUrl(query: Parameters<typeof fetchDealsPage>[0]) {
  const calls: string[] = []
  vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
    calls.push(String(input))
    return new Response('[]', { headers: { 'X-Total-Page-Count': '1' } })
  })
  await fetchDealsPage(query)
  return calls[0] ?? ''
}

describe('fetchDealsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('не отправляет desc=true/false — только desc=1 при смене направления', async () => {
    // Price по умолчанию возрастает: убывание требует desc=1.
    expect(await requestUrl({ sortBy: 'Price', desc: false })).not.toContain('desc=')
    expect(await requestUrl({ sortBy: 'Price', desc: true })).toContain('desc=1')

    // Deal Rating по умолчанию убывает: возрастание требует desc=1.
    expect(await requestUrl({ sortBy: 'Deal Rating', desc: true })).not.toContain('desc=')
    expect(await requestUrl({ sortBy: 'Deal Rating', desc: false })).toContain('desc=1')
  })
})

describe('лимит запросов', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    resetApiGateForTests()
  })

  it('на 429 сообщает о лимите и учитывает Retry-After', async () => {
    vi.stubGlobal(
      'fetch',
      async () =>
        new Response('{"error":"blocked"}', {
          status: 429,
          headers: { 'retry-after': '120' },
        }),
    )

    await expect(fetchStores()).rejects.toThrow(/лимит API/)
    // Повторный запрос не ждёт паузу вхолостую, а сразу сообщает время.
    await expect(fetchStores()).rejects.toThrow(/через 2 мин/)
  })

  it('не выпускает в сеть запрос, который ждал очереди, после 429', async () => {
    vi.useFakeTimers()
    try {
      let calls = 0
      vi.stubGlobal('fetch', async () => {
        calls += 1
        if (calls === 1) {
          // Первый запрос «висит» немного, чтобы второй успел встать в очередь.
          await new Promise((resolve) => setTimeout(resolve, 10))
          return new Response('{}', { status: 429, headers: { 'retry-after': '120' } })
        }
        return new Response('[]', { status: 200 })
      })

      const settled = Promise.allSettled([fetchStores(), fetchGameDetails('612')])
      await vi.advanceTimersByTimeAsync(5000)
      const results = await settled

      expect(calls).toBe(1)
      expect(results[0]?.status).toBe('rejected')
      expect(results[1]?.status).toBe('rejected')
      expect((results[1] as PromiseRejectedResult).reason).toMatchObject({ status: 429 })
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('отмена запросов', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    resetApiGateForTests()
  })

  it('отмена одного подписчика не рвёт общий запрос', async () => {
    const deferred = Promise.withResolvers<Response>()
    vi.stubGlobal('fetch', () => deferred.promise)

    const controller = new AbortController()
    const aborted = fetchStores({ signal: controller.signal })
    const shared = fetchStores()
    controller.abort()

    await expect(aborted).rejects.toHaveProperty('name', 'AbortError')

    deferred.resolve(new Response('[]', { status: 200 }))
    await expect(shared).resolves.toEqual([])
  })

  it('отмена запроса не включает карантин лимита', async () => {
    vi.stubGlobal('fetch', () => new Promise<Response>(() => {}))
    const controller = new AbortController()
    const aborted = fetchStores({ signal: controller.signal })
    controller.abort()

    await expect(aborted).rejects.toHaveProperty('name', 'AbortError')
    expect(isRateLimited()).toBe(false)
  })
})
