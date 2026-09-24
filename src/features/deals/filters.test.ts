import { describe, expect, it } from 'vitest'
import { makeDeal, makeTagIndex } from '@/test/factories'
import {
  activeFilterCount,
  defaultFilters,
  filterDeals,
  filtersFromSearchParams,
  filtersToSearchParams,
  sortByRelevance,
  toApiQuery,
} from './filters'

describe('filtersToSearchParams / filtersFromSearchParams', () => {
  it('не пишет в URL значения по умолчанию', () => {
    const params = filtersToSearchParams(defaultFilters)
    expect([...params.keys()]).toEqual([])
  })

  it('восстанавливает фильтры из URL', () => {
    const params = new URLSearchParams(
      'title=witcher&store=1&min=5&max=30&mc=80&steam=90&age=30&sale=0&aaa=1&sort=Price&desc=0&savings=50&tags=rpg,open%20world&match=all',
    )
    const filters = filtersFromSearchParams(params)
    expect(filters).toMatchObject({
      title: 'witcher',
      storeIDs: ['1'],
      lowerPrice: 5,
      upperPrice: 30,
      metacritic: 80,
      steamRating: 90,
      maxAge: 30,
      onSale: false,
      aaa: true,
      sortBy: 'Price',
      desc: false,
      minSavings: 50,
      tags: ['rpg', 'open world'],
      matchAll: true,
    })
  })

  it('делает полный круг сериализации', () => {
    const filters = {
      ...defaultFilters,
      title: 'doom',
      upperPrice: 25,
      minSavings: 25,
      tags: ['rpg'],
      sortBy: 'Metacritic' as const,
    }
    const restored = filtersFromSearchParams(filtersToSearchParams(filters))
    expect(restored).toEqual(filters)
  })

  it('игнорирует неизвестную сортировку', () => {
    expect(filtersFromSearchParams(new URLSearchParams('sort=Hacked')).sortBy).toBe(
      defaultFilters.sortBy,
    )
  })

  it('читает несколько магазинов из URL и пишет их обратно', () => {
    const filters = filtersFromSearchParams(new URLSearchParams('store=1,7,11'))
    expect(filters.storeIDs).toEqual(['1', '7', '11'])
    expect(filtersToSearchParams(filters).get('store')).toBe('1,7,11')
  })

  it('дедуплицирует магазины и пустые значения', () => {
    const filters = filtersFromSearchParams(new URLSearchParams('store=1,,1,7'))
    expect(filters.storeIDs).toEqual(['1', '7'])
  })
})

describe('filterDeals', () => {
  const index = makeTagIndex()
  const deals = [
    makeDeal({ dealID: 'a', savings: 80, steamAppID: '570' }),
    makeDeal({ dealID: 'b', savings: 20, steamAppID: '292030' }),
    makeDeal({ dealID: 'c', savings: 60, steamAppID: null }),
  ]

  it('возвращает всё, если клиентских фильтров нет', () => {
    expect(filterDeals(deals, defaultFilters, index)).toHaveLength(3)
  })

  it('фильтрует по минимальной скидке', () => {
    const result = filterDeals(deals, { ...defaultFilters, minSavings: 50 }, index)
    expect(result.map((deal) => deal.dealID)).toEqual(['a', 'c'])
  })

  it('фильтрует по любому из тегов', () => {
    const result = filterDeals(deals, { ...defaultFilters, tags: ['open world'] }, index)
    expect(result.map((deal) => deal.dealID)).toEqual(['b'])
  })

  it('требует все теги в режиме matchAll', () => {
    const result = filterDeals(
      deals,
      { ...defaultFilters, tags: ['rpg', 'open world'], matchAll: true },
      index,
    )
    expect(result.map((deal) => deal.dealID)).toEqual(['b'])
  })

  it('не пропускает игры без тегов при активном фильтре', () => {
    const result = filterDeals(deals, { ...defaultFilters, tags: ['rpg'] }, index)
    expect(result.map((deal) => deal.dealID)).toEqual(['b'])
  })

  it('сравнивает теги без учёта регистра', () => {
    const result = filterDeals(deals, { ...defaultFilters, tags: ['moba'] }, index)
    expect(result.map((deal) => deal.dealID)).toEqual(['a'])
  })
})

describe('sortByRelevance', () => {
  it('поднимает точные и начинающиеся совпадения', () => {
    const deals = [
      makeDeal({ dealID: 'a', title: 'Sniper Elite', internalName: 'WITCHER' }),
      makeDeal({ dealID: 'b', title: 'The Witcher 3' }),
      makeDeal({ dealID: 'c', title: 'Witcher' }),
    ]
    const sorted = sortByRelevance(deals, 'witcher')
    expect(sorted.map((deal) => deal.dealID)).toEqual(['c', 'b', 'a'])
  })

  it('не меняет порядок при пустом запросе', () => {
    const deals = [makeDeal({ dealID: 'a' }), makeDeal({ dealID: 'b' })]
    expect(sortByRelevance(deals, '  ').map((deal) => deal.dealID)).toEqual(['a', 'b'])
  })
})

describe('toApiQuery', () => {
  it('не отправляет нулевые ограничения в API', () => {
    const query = toApiQuery(defaultFilters)
    expect(query.lowerPrice).toBe(0)
    expect(query.metacritic).toBe(0)
    expect(query.title).toBeUndefined()
    expect(query.storeID).toBeUndefined()
    expect(query.onSale).toBe(true)
  })

  it('передаёт магазин в API только при единственном выборе', () => {
    expect(toApiQuery({ ...defaultFilters, storeIDs: ['1'] }).storeID).toBe('1')
    expect(toApiQuery({ ...defaultFilters, storeIDs: ['1', '7'] }).storeID).toBeUndefined()
  })
})

describe('activeFilterCount', () => {
  it('считает теги отдельно и игнорирует значения по умолчанию', () => {
    expect(activeFilterCount(defaultFilters)).toBe(0)
    expect(
      activeFilterCount({ ...defaultFilters, tags: ['rpg', 'moba'], minSavings: 30, aaa: true }),
    ).toBe(4)
  })
})
