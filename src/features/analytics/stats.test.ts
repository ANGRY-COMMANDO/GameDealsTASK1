import { describe, expect, it } from 'vitest'
import { makeDeal } from '@/test/factories'
import {
  discountHistogram,
  releaseYearStats,
  scorePricePoints,
  storeStats,
  summaryStats,
} from './stats'

describe('discountHistogram', () => {
  it('раскладывает скидки по корзинам', () => {
    const deals = [
      makeDeal({ savings: 0 }),
      makeDeal({ savings: 9.9 }),
      makeDeal({ savings: 10 }),
      makeDeal({ savings: 95 }),
      makeDeal({ savings: 100 }),
    ]
    const buckets = discountHistogram(deals)
    expect(buckets).toHaveLength(10)
    expect(buckets[0]?.count).toBe(2)
    expect(buckets[1]?.count).toBe(1)
    expect(buckets.at(-1)?.count).toBe(2)
  })
})

describe('summaryStats', () => {
  it('считает среднее, медиану, максимум и экономию', () => {
    const deals = [
      makeDeal({ savings: 10, salePrice: 9, normalPrice: 10 }),
      makeDeal({ savings: 30, salePrice: 7, normalPrice: 10 }),
      makeDeal({ savings: 80, salePrice: 2, normalPrice: 10 }),
    ]
    const stats = summaryStats(deals)
    expect(stats.count).toBe(3)
    expect(stats.avgSavings).toBeCloseTo(40)
    expect(stats.medianSavings).toBeCloseTo(30)
    expect(stats.maxSavings).toBeCloseTo(80)
    expect(stats.totalSaving).toBeCloseTo(12)
  })

  it('безопасно работает с пустой выборкой', () => {
    expect(summaryStats([])).toEqual({
      count: 0,
      avgSavings: 0,
      medianSavings: 0,
      maxSavings: 0,
      totalSaving: 0,
    })
  })
})

describe('storeStats', () => {
  it('группирует предложения по магазинам', () => {
    const deals = [
      makeDeal({ storeID: '1', savings: 10, salePrice: 10 }),
      makeDeal({ storeID: '1', savings: 30, salePrice: 20 }),
      makeDeal({ storeID: '2', savings: 50, salePrice: 5 }),
    ]
    const stats = storeStats(deals, [{ storeID: '1', storeName: 'Steam', images: { icon: '' } }])
    expect(stats[0]).toMatchObject({
      storeID: '1',
      name: 'Steam',
      count: 2,
      avgSavings: 20,
      avgPrice: 15,
    })
    expect(stats[1]).toMatchObject({ storeID: '2', name: 'Магазин 2', count: 1 })
  })
})

describe('releaseYearStats', () => {
  it('отбрасывает старые игры и считает средние по годам', () => {
    const deals = [
      makeDeal({ releaseDate: Date.UTC(2020, 5, 1) / 1000, salePrice: 10, savings: 20 }),
      makeDeal({ releaseDate: Date.UTC(2020, 8, 1) / 1000, salePrice: 20, savings: 40 }),
      makeDeal({ releaseDate: Date.UTC(1999, 0, 1) / 1000, salePrice: 5, savings: 90 }),
    ]
    const stats = releaseYearStats(deals)
    expect(stats).toHaveLength(1)
    expect(stats[0]).toMatchObject({ year: 2020, count: 2, avgPrice: 15, avgSavings: 30 })
  })
})

describe('scorePricePoints', () => {
  it('оставляет только игры с оценкой Metacritic', () => {
    const points = scorePricePoints([
      makeDeal({ metacriticScore: 90, steamRatingCount: 100 }),
      makeDeal({ metacriticScore: 0 }),
    ])
    expect(points).toHaveLength(1)
    expect(points[0]?.x).toBe(90)
  })
})
