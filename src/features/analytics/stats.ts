import type { Deal, Store } from '@/shared/api/schemas'

type HistogramBucket = { label: string; count: number }

export function discountHistogram(deals: Deal[], step = 10): HistogramBucket[] {
  const buckets: HistogramBucket[] = []
  for (let start = 0; start < 100; start += step) {
    const end = start + step
    buckets.push({ label: `${start}–${end}%`, count: 0 })
  }
  for (const deal of deals) {
    const value = Math.min(99.999, Math.max(0, deal.savings))
    const index = Math.floor(value / step)
    const bucket = buckets[Math.min(index, buckets.length - 1)]
    if (bucket) bucket.count += 1
  }
  return buckets
}

export type StoreStat = {
  storeID: string
  name: string
  count: number
  avgSavings: number
  avgPrice: number
}

export function storeStats(deals: Deal[], stores: Store[]): StoreStat[] {
  const names = new Map(stores.map((store) => [store.storeID, store.storeName]))
  return [...Map.groupBy(deals, (deal) => deal.storeID)]
    .map(([storeID, items]) => ({
      storeID,
      name: names.get(storeID) ?? `Магазин ${storeID}`,
      count: items.length,
      avgSavings: items.reduce((sum, deal) => sum + deal.savings, 0) / items.length,
      avgPrice: items.reduce((sum, deal) => sum + deal.salePrice, 0) / items.length,
    }))
    .toSorted((a, b) => b.count - a.count)
}

type YearStat = { year: number; count: number; avgPrice: number; avgSavings: number }

export function releaseYearStats(deals: Deal[], minYear = 2005): YearStat[] {
  const currentYear = new Date().getFullYear() + 2
  const byYear = Map.groupBy(
    deals.filter((deal) => deal.releaseDate > 0),
    (deal) => {
      // CheapShark отдаёт секунды; подстраховываемся на случай миллисекунд.
      const ms = deal.releaseDate < 1e12 ? deal.releaseDate * 1000 : deal.releaseDate
      return new Date(ms).getFullYear()
    },
  )
  return [...byYear.entries()]
    .filter(([year]) => year >= minYear && year <= currentYear)
    .map(([year, items]) => ({
      year,
      count: items.length,
      avgPrice: items.reduce((sum, deal) => sum + deal.salePrice, 0) / items.length,
      avgSavings: items.reduce((sum, deal) => sum + deal.savings, 0) / items.length,
    }))
    .toSorted((a, b) => a.year - b.year)
}

type ScatterPoint = { x: number; y: number; r: number; label: string }

export function scorePricePoints(deals: Deal[]): ScatterPoint[] {
  return deals
    .filter((deal) => deal.metacriticScore > 0)
    .map((deal) => ({
      x: deal.metacriticScore,
      y: deal.salePrice,
      r: Math.min(22, Math.max(3, Math.sqrt(deal.steamRatingCount) / 12)),
      label: deal.title,
    }))
}

type SummaryStats = {
  count: number
  avgSavings: number
  medianSavings: number
  maxSavings: number
  totalSaving: number
}

export function summaryStats(deals: Deal[]): SummaryStats {
  if (deals.length === 0) {
    return { count: 0, avgSavings: 0, medianSavings: 0, maxSavings: 0, totalSaving: 0 }
  }
  const savings = deals.map((deal) => deal.savings).toSorted((a, b) => a - b)
  const middle = Math.floor(savings.length / 2)
  const medianSavings =
    savings.length % 2 === 0
      ? ((savings[middle - 1] ?? 0) + (savings[middle] ?? 0)) / 2
      : (savings[middle] ?? 0)

  return {
    count: deals.length,
    avgSavings: savings.reduce((sum, value) => sum + value, 0) / savings.length,
    medianSavings,
    maxSavings: savings.at(-1) ?? 0,
    totalSaving: deals.reduce(
      (sum, deal) => sum + Math.max(0, deal.normalPrice - deal.salePrice),
      0,
    ),
  }
}

export type LowComparisonItem = {
  title: string
  current: number
  low: number
}
