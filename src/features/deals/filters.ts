import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { DEFAULT_SORT_BY } from '@/shared/api/client'
import type { DealsPageQuery } from '@/shared/api/client'
import type { Deal, TagIndex } from '@/shared/api/schemas'

export const SORT_OPTIONS = [
  { value: DEFAULT_SORT_BY, label: 'Выгодность сделки' },
  { value: 'Savings', label: 'Размер скидки' },
  { value: 'Price', label: 'Цена' },
  { value: 'Metacritic', label: 'Оценка Metacritic' },
  { value: 'Reviews', label: 'Отзывы Steam' },
  { value: 'Release', label: 'Дата выхода' },
  { value: 'Last Change', label: 'Недавно изменилась цена' },
  { value: 'Store', label: 'Магазин' },
  { value: 'Title', label: 'Название' },
] as const

const SORT_VALUES = SORT_OPTIONS.map((option) => option.value)

export const MAX_PRICE = 70

/** Быстрые пресеты ленты: их же исключаем из чипсов активных фильтров, чтобы не дублировать. */
export const QUICK_PRESETS = {
  minSavings: 50,
  upperPrice: 10,
  metacritic: 75,
} as const

export type Filters = {
  title: string
  storeIDs: string[]
  lowerPrice: number
  upperPrice: number
  metacritic: number
  steamRating: number
  maxAge: number
  onSale: boolean
  aaa: boolean
  sortBy: (typeof SORT_OPTIONS)[number]['value']
  desc: boolean
  /** Клиентские фильтры — применяются к уже загруженным страницам. */
  minSavings: number
  tags: string[]
  matchAll: boolean
}

export const defaultFilters: Filters = {
  title: '',
  storeIDs: [],
  lowerPrice: 0,
  upperPrice: MAX_PRICE,
  metacritic: 0,
  steamRating: 0,
  maxAge: 0,
  onSale: true,
  aaa: false,
  sortBy: DEFAULT_SORT_BY,
  desc: true,
  minSavings: 0,
  tags: [],
  matchAll: false,
}

const number = (value: string | null, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && value !== null && value !== '' ? parsed : fallback
}

/** Быстрый пресет считается включённым, только если фильтр ровно равен его значению. */
export function isQuickSavings(filters: Filters) {
  return filters.minSavings === QUICK_PRESETS.minSavings
}

export function isQuickPrice(filters: Filters) {
  return filters.lowerPrice === 0 && filters.upperPrice === QUICK_PRESETS.upperPrice
}

export function isQuickMetacritic(filters: Filters) {
  return filters.metacritic === QUICK_PRESETS.metacritic
}

export function filtersFromSearchParams(params: URLSearchParams): Filters {
  const sortBy = params.get('sort')
  return {
    title: params.get('title') ?? '',
    storeIDs: [
      ...new Set(
        (params.get('store') ?? '')
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ],
    lowerPrice: Math.max(0, number(params.get('min'), 0)),
    upperPrice: Math.min(MAX_PRICE, Math.max(1, number(params.get('max'), MAX_PRICE))),
    metacritic: Math.max(0, number(params.get('mc'), 0)),
    steamRating: Math.max(0, number(params.get('steam'), 0)),
    maxAge: Math.max(0, number(params.get('age'), 0)),
    onSale: params.get('sale') !== '0',
    aaa: params.get('aaa') === '1',
    sortBy:
      sortBy && (SORT_VALUES as readonly string[]).includes(sortBy)
        ? (sortBy as Filters['sortBy'])
        : defaultFilters.sortBy,
    desc: params.get('desc') !== '0',
    minSavings: Math.max(0, number(params.get('savings'), 0)),
    tags: (params.get('tags') ?? '')
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean),
    matchAll: params.get('match') === 'all',
  }
}

export function filtersToSearchParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.title) params.set('title', filters.title)
  if (filters.storeIDs.length > 0) params.set('store', filters.storeIDs.join(','))
  if (filters.lowerPrice > 0) params.set('min', String(filters.lowerPrice))
  if (filters.upperPrice !== MAX_PRICE) params.set('max', String(filters.upperPrice))
  if (filters.metacritic > 0) params.set('mc', String(filters.metacritic))
  if (filters.steamRating > 0) params.set('steam', String(filters.steamRating))
  if (filters.maxAge > 0) params.set('age', String(filters.maxAge))
  if (!filters.onSale) params.set('sale', '0')
  if (filters.aaa) params.set('aaa', '1')
  if (filters.sortBy !== defaultFilters.sortBy) params.set('sort', filters.sortBy)
  if (!filters.desc) params.set('desc', '0')
  if (filters.minSavings > 0) params.set('savings', String(filters.minSavings))
  if (filters.tags.length > 0) params.set('tags', filters.tags.join(','))
  if (filters.matchAll) params.set('match', 'all')
  return params
}

/** Серверные параметры запроса к /deals (всё, что умеет фильтровать сам API). */
export function toApiQuery(filters: Filters): DealsPageQuery {
  return {
    // Несколько магазинов API не умеет: в этом случае фильтруем загруженные страницы на клиенте.
    storeID: filters.storeIDs.length === 1 ? filters.storeIDs[0] : undefined,
    lowerPrice: filters.lowerPrice,
    upperPrice: filters.upperPrice,
    metacritic: filters.metacritic,
    steamRating: filters.steamRating,
    maxAge: filters.maxAge,
    onSale: filters.onSale,
    AAA: filters.aaa,
    title: filters.title || undefined,
    sortBy: filters.sortBy,
    desc: filters.desc,
  }
}

export function hasClientFilters(filters: Filters) {
  return filters.minSavings > 0 || filters.tags.length > 0 || filters.storeIDs.length > 1
}

export function activeFilterCount(filters: Filters) {
  let count = 0
  if (filters.title) count += 1
  if (filters.storeIDs.length > 0) count += filters.storeIDs.length
  if (filters.lowerPrice > 0 || filters.upperPrice !== MAX_PRICE) count += 1
  if (filters.metacritic > 0) count += 1
  if (filters.steamRating > 0) count += 1
  if (filters.maxAge > 0) count += 1
  if (!filters.onSale) count += 1
  if (filters.aaa) count += 1
  if (filters.minSavings > 0) count += 1
  if (filters.tags.length > 0) count += filters.tags.length
  return count
}

export function tagsForDeal(deal: Deal, index: TagIndex | undefined) {
  if (!index || !deal.steamAppID) return []
  return index.games[deal.steamAppID]?.tags ?? []
}

/** Клиентская фильтрация загруженной страницы (скидка, теги и мультивыбор магазинов). */
export function filterDeals(deals: Deal[], filters: Filters, index?: TagIndex): Deal[] {
  if (!hasClientFilters(filters)) return deals
  const wanted = new Set(filters.tags.map((tag) => tag.toLowerCase()))
  const stores = new Set(filters.storeIDs)
  return deals.filter((deal) => {
    if (filters.storeIDs.length > 1 && !stores.has(deal.storeID)) return false
    if (filters.minSavings > 0 && deal.savings < filters.minSavings) return false
    if (wanted.size === 0) return true
    const tags = new Set(tagsForDeal(deal, index).map((tag) => tag.toLowerCase()))
    if (tags.size === 0) return false
    return filters.matchAll ? wanted.isSubsetOf(tags) : !wanted.isDisjointFrom(tags)
  })
}

/**
 * CheapShark ищет по названию и по внутреннему имени, поэтому в выдачу попадают
 * лишние игры (например, «Switcher» находится по запросу «witcher»).
 * Небольшой скор релевантности поднимает точные совпадения наверх.
 */
function relevanceScore(deal: Deal, query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return 0
  const title = deal.title.toLowerCase()
  if (title === normalized) return 4
  if (title.startsWith(normalized)) return 3
  if (title.includes(normalized)) return 2
  if (deal.internalName.toLowerCase().includes(normalized.replace(/\s+/g, ''))) return 1
  return 0
}

export function sortByRelevance(deals: Deal[], query: string) {
  return deals.toSorted((a, b) => relevanceScore(b, query) - relevanceScore(a, query))
}

/** Короткое имя для сохранённого пресета — по активным фильтрам. */
export function describeFilters(filters: Filters): string {
  const parts: string[] = []
  if (filters.title) parts.push(`«${filters.title}»`)
  if (filters.storeIDs.length > 0) parts.push(`магазинов: ${filters.storeIDs.length}`)
  if (filters.minSavings > 0) parts.push(`скидка ${filters.minSavings}%+`)
  if (filters.lowerPrice > 0 || filters.upperPrice !== MAX_PRICE) {
    parts.push(`$${filters.lowerPrice}–${filters.upperPrice}`)
  }
  if (filters.metacritic > 0) parts.push(`MC ${filters.metacritic}+`)
  if (filters.steamRating > 0) parts.push(`Steam ${filters.steamRating}%+`)
  if (filters.maxAge > 0) parts.push(`изменено за ${filters.maxAge} дн.`)
  if (filters.tags.length > 0) parts.push(filters.tags.join(', '))
  if (filters.aaa) parts.push('AAA')
  return parts.join(' · ') || 'Все скидки'
}

export function useFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams])

  const update = useCallback(
    (updater: (previous: Filters) => Partial<Filters>) => {
      setSearchParams(
        (previous) => {
          const current = filtersFromSearchParams(previous)
          const serialized = filtersToSearchParams({ ...current, ...updater(current) })
          const next = new URLSearchParams(previous)
          for (const key of new Set(next.keys())) {
            if (!serialized.has(key)) next.delete(key)
          }
          for (const [key, value] of serialized) next.set(key, value)
          return next
        },
        { replace: true, preventScrollReset: true },
      )
    },
    [setSearchParams],
  )

  const setFilters = useCallback(
    (patch: Partial<Filters>) => {
      update(() => patch)
    },
    [update],
  )

  const resetFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true, preventScrollReset: true })
  }, [setSearchParams])

  /** Применяет сохранённый пресет целиком, заменяя текущий набор фильтров. */
  const applyPreset = useCallback(
    (search: string) => {
      setSearchParams(new URLSearchParams(search), { replace: true, preventScrollReset: true })
    },
    [setSearchParams],
  )

  const toggleTag = useCallback(
    (tag: string) => {
      update((current) => ({
        tags: current.tags.includes(tag)
          ? current.tags.filter((item) => item !== tag)
          : [...current.tags, tag],
      }))
    },
    [update],
  )

  return { filters, setFilters, resetFilters, applyPreset, toggleTag }
}
