import type { z } from 'zod'
import {
  infiniteQueryOptions,
  keepPreviousData,
  queryOptions,
  useInfiniteQuery,
  useQueries,
  useQuery,
} from '@tanstack/react-query'
import {
  DEALS_PAGE_SIZE,
  DEFAULT_SORT_BY,
  fetchDealsPage,
  fetchGameDetails,
  fetchGameSearch,
  fetchStores,
} from './client'
import type { DealsPageQuery } from './client'
import {
  emptyGameHistory,
  emptyPriceHistory,
  emptyTagIndex,
  gameHistorySchema,
  priceHistorySchema,
  tagIndexSchema,
  type Deal,
  type GameHistory,
  type PriceHistory,
  type TagIndex,
} from './schemas'

const ONE_HOUR = 60 * 60_000
const THIRTY_MINUTES = 30 * 60_000
const ONE_DAY = 24 * 60 * 60_000

/** Сколько страниц грузит аналитика по умолчанию. */
export const ANALYTICS_PAGES = 2
/** Доступные размеры выборки (в страницах) — используются в URL `?pages=`. */
export const ANALYTICS_PAGE_OPTIONS = [2, 5] as const

/** Приводит число из URL к поддерживаемому размеру выборки. */
export function normalizeAnalyticsPages(pages: number) {
  return (ANALYTICS_PAGE_OPTIONS as readonly number[]).includes(pages) ? pages : ANALYTICS_PAGES
}

/** Все ключи кэша в одном месте — хукам и роутеру не нужно знать их устройство. */
const queryKeys = {
  stores: ['stores'] as const,
  deals: (filters: DealsPageQuery) => ['deals', filters] as const,
  analyticsDeals: (pages: number) => ['deals', 'analytics', DEFAULT_SORT_BY, pages] as const,
  game: (gameID: string) => ['game', gameID] as const,
  gameSearch: (title: string) => ['game-search', title] as const,
  tagIndex: ['tag-index'] as const,
  priceHistory: ['price-history'] as const,
  gameHistory: ['game-history'] as const,
}

/** Опции запросов описаны один раз: их переиспользуют и хуки, и route-loader'ы. */
const storesQueryOptions = queryOptions({
  queryKey: queryKeys.stores,
  queryFn: ({ signal }) => fetchStores({ signal }),
  staleTime: ONE_DAY,
  gcTime: ONE_DAY,
})

function dealsQueryOptions(filters: DealsPageQuery) {
  // Поиск по названию отдаётся одной страницей (см. комментарий в client.ts).
  const singlePage = Boolean(filters.title)
  return infiniteQueryOptions({
    queryKey: queryKeys.deals(filters),
    queryFn: ({ pageParam, signal }) =>
      fetchDealsPage({ ...filters, pageNumber: pageParam }, { signal }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (singlePage) return undefined
      return allPages.length < lastPage.totalPages ? allPages.length + 1 : undefined
    },
    staleTime: ONE_HOUR,
    placeholderData: keepPreviousData,
  })
}

/** Выборка «лучших скидок» для страницы аналитики: несколько страниц параллельно. */
export function analyticsDealsQueryOptions(pages = ANALYTICS_PAGES) {
  const safePages = normalizeAnalyticsPages(pages)
  return queryOptions({
    queryKey: queryKeys.analyticsDeals(safePages),
    queryFn: async ({ signal }) => {
      // Частичный успех лучше полного отказа: CheapShark может ограничить часть запросов.
      const results = await Promise.allSettled(
        Array.from({ length: safePages }, (_, index) =>
          fetchDealsPage(
            {
              pageNumber: index + 1,
              pageSize: DEALS_PAGE_SIZE,
              sortBy: DEFAULT_SORT_BY,
              desc: true,
              onSale: true,
            },
            { signal },
          ),
        ),
      )
      const byDealID = new Map<string, Deal>()
      for (const result of results) {
        if (result.status !== 'fulfilled') continue
        for (const deal of result.value.deals) byDealID.set(deal.dealID, deal)
      }
      if (byDealID.size === 0) {
        const first = results[0]
        throw first?.status === 'rejected' ? first.reason : new Error('Не удалось загрузить данные')
      }
      return [...byDealID.values()]
    },
    staleTime: ONE_HOUR,
  })
}

export function gameQueryOptions(gameID: string) {
  return queryOptions({
    queryKey: queryKeys.game(gameID),
    queryFn: ({ signal }) => fetchGameDetails(gameID, { signal }),
    staleTime: ONE_HOUR,
  })
}

/** Подсказки поиска: запрашиваются, только когда запрос осмысленный (4+ символа). */
function gameSearchQueryOptions(title: string) {
  return queryOptions({
    queryKey: queryKeys.gameSearch(title),
    queryFn: ({ signal }) => fetchGameSearch(title, { signal }),
    enabled: title.length >= 4,
    staleTime: THIRTY_MINUTES,
    placeholderData: keepPreviousData,
  })
}

async function fetchStaticData<T>(file: string, schema: z.ZodType<T>, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/${file}`, {
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) return fallback
    const json: unknown = await response.json()
    const parsed = schema.safeParse(json)
    return parsed.success ? parsed.data : fallback
  } catch {
    return fallback
  }
}

const tagIndexQueryOptions = queryOptions<TagIndex>({
  queryKey: queryKeys.tagIndex,
  queryFn: () => fetchStaticData('tags.json', tagIndexSchema, emptyTagIndex),
  staleTime: Infinity,
})

const priceHistoryQueryOptions = queryOptions<PriceHistory>({
  queryKey: queryKeys.priceHistory,
  queryFn: () => fetchStaticData('price-history.json', priceHistorySchema, emptyPriceHistory),
  staleTime: Infinity,
})

const gameHistoryQueryOptions = queryOptions<GameHistory>({
  queryKey: queryKeys.gameHistory,
  queryFn: () => fetchStaticData('game-history.json', gameHistorySchema, emptyGameHistory),
  staleTime: Infinity,
})

export function useStores() {
  return useQuery(storesQueryOptions)
}

export function useDealsInfinite(filters: DealsPageQuery) {
  return useInfiniteQuery(dealsQueryOptions(filters))
}

export function useAnalyticsDeals(pages = ANALYTICS_PAGES) {
  return useQuery(analyticsDealsQueryOptions(pages))
}

/** Исторические минимумы для карточек «текущая цена против минимума за всё время». */
export function useGameLows(deals: Deal[], limit = 3) {
  const slice = deals.slice(0, limit)
  return useQueries({
    queries: slice.map((deal) => gameQueryOptions(deal.gameID)),
    combine: (results) =>
      results.map((result, index) => ({
        deal: slice[index]!,
        low: result.data?.cheapestPriceEver.price,
        isLoading: result.isLoading,
      })),
  })
}

export function useGameDetails(gameID: string) {
  return useQuery(gameQueryOptions(gameID))
}

export function useGameSearch(title: string) {
  return useQuery(gameSearchQueryOptions(title.trim().toLowerCase()))
}

export function useTagIndex() {
  return useQuery(tagIndexQueryOptions)
}

export function usePriceHistory() {
  return useQuery(priceHistoryQueryOptions)
}

export function useGameHistory() {
  return useQuery(gameHistoryQueryOptions)
}
