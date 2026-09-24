import type { Page } from '@playwright/test'

/**
 * Моки CheapShark API для сквозных тестов: тесты не должны зависеть от стороннего сервиса
 * и его ограничений по частоте запросов. Живой режим: E2E_LIVE=1 npx playwright test.
 */

const STORES = [
  { storeID: '1', storeName: 'Steam', images: { icon: '/img/stores/icons/0.png' } },
  { storeID: '7', storeName: 'GOG', images: { icon: '/img/stores/icons/6.png' } },
  { storeID: '11', storeName: 'Humble Store', images: { icon: '/img/stores/icons/10.png' } },
]

const AB = 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps'

const DEALS = [
  {
    internalName: 'THEWITCHER3WILDHUNT',
    title: 'The Witcher 3: Wild Hunt',
    dealID: 'deal-witcher',
    storeID: '1',
    gameID: '292030',
    salePrice: '7.99',
    normalPrice: '39.99',
    savings: '80.02',
    metacriticScore: '93',
    steamRatingPercent: '98',
    steamRatingCount: '800000',
    steamAppID: '292030',
    releaseDate: 1431993600,
    dealRating: '10.0',
    thumb: `${AB}/292030/capsule_231x87.jpg`,
  },
  {
    internalName: 'TORCHLIGHT2',
    title: 'Torchlight II',
    dealID: 'deal-torchlight',
    storeID: '7',
    gameID: '200710',
    salePrice: '3.99',
    normalPrice: '19.99',
    savings: '80.04',
    metacriticScore: '88',
    steamRatingPercent: '94',
    steamRatingCount: '20000',
    steamAppID: '200710',
    releaseDate: 1346889600,
    dealRating: '9.8',
    thumb: `${AB}/200710/capsule_231x87.jpg`,
  },
  {
    internalName: 'DARKSIDERSIII',
    title: 'Darksiders III',
    dealID: 'enc%2Boded%3D',
    storeID: '11',
    gameID: '75550',
    salePrice: '9.99',
    normalPrice: '59.99',
    savings: '83.35',
    metacriticScore: '70',
    steamRatingPercent: '62',
    steamRatingCount: '5000',
    steamAppID: '606280',
    releaseDate: 1542931200,
    dealRating: '9.1',
    thumb: `${AB}/606280/capsule_231x87.jpg`,
  },
  {
    internalName: 'DEUSEX',
    title: 'Deus Ex: Human Revolution',
    dealID: 'deal-deusex',
    storeID: '1',
    gameID: '102249',
    salePrice: '1.99',
    normalPrice: '19.99',
    savings: '90.05',
    metacriticScore: '91',
    steamRatingPercent: '91',
    steamRatingCount: '13534',
    steamAppID: '238010',
    releaseDate: 1382400000,
    dealRating: '10.0',
    thumb: `${AB}/238010/capsule_231x87.jpg`,
  },
  {
    internalName: 'BORDERLANDS2',
    title: 'Borderlands 2',
    dealID: 'deal-borderlands',
    storeID: '11',
    gameID: '3128',
    salePrice: '4.99',
    normalPrice: '19.99',
    savings: '75.04',
    metacriticScore: '89',
    steamRatingPercent: '96',
    steamRatingCount: '250000',
    steamAppID: '49520',
    releaseDate: 1347926400,
    dealRating: '9.5',
    thumb: `${AB}/49520/capsule_231x87.jpg`,
  },
  {
    internalName: 'NOTAGAME',
    title: 'Indie Without Tags',
    dealID: 'deal-notags',
    storeID: '7',
    gameID: '999001',
    salePrice: '2.49',
    normalPrice: '9.99',
    savings: '75.08',
    metacriticScore: '0',
    steamRatingPercent: '0',
    steamRatingCount: '0',
    steamAppID: null,
    releaseDate: 1700000000,
    dealRating: '7.5',
    thumb: '',
  },
]

const GAME_DETAILS: Record<string, unknown> = {
  '292030': {
    info: { title: 'The Witcher 3: Wild Hunt', steamAppID: '292030', thumb: DEALS[0]?.thumb },
    cheapestPriceEver: { price: 3.99, date: 1735689600 },
    deals: [
      { storeID: '1', dealID: 'deal-witcher', price: 7.99, retailPrice: 39.99, savings: 80.02 },
      { storeID: '7', dealID: 'deal-witcher-gog', price: 9.99, retailPrice: 39.99, savings: 75.02 },
      {
        storeID: '11',
        dealID: 'deal-witcher-humble',
        price: 11.99,
        retailPrice: 39.99,
        savings: 70.02,
      },
    ],
  },
}

function anyGame(gameID: string) {
  return (
    GAME_DETAILS[gameID] ?? {
      info: { title: `Игра ${gameID}`, steamAppID: null, thumb: '' },
      cheapestPriceEver: { price: 2.99, date: 1735689600 },
      deals: [
        { storeID: '1', dealID: `deal-${gameID}`, price: 4.99, retailPrice: 19.99, savings: 75 },
      ],
    }
  )
}

export async function installApiMocks(page: Page) {
  await page.route('**/open.er-api.com/**', (route) =>
    route.fulfill({
      json: { result: 'success', rates: { RUB: 84.4 } },
      headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
    }),
  )

  await page.route('**/data/game-history.json', (route) =>
    route.fulfill({
      json: {
        updatedAt: '2026-09-19',
        points: [
          { date: '2026-09-18', prices: { '292030': 9.99 } },
          { date: '2026-09-19', prices: { '292030': 7.99 } },
        ],
      },
      headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
    }),
  )

  await page.route('**/api/1.0/stores', (route) =>
    route.fulfill({
      json: STORES,
      headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
    }),
  )

  await page.route('**/api/1.0/deals**', (route) => {
    const url = new URL(route.request().url())
    const title = url.searchParams.get('title')
    if (title) {
      const needle = title.toLowerCase()
      const filtered = DEALS.filter((deal) => deal.title.toLowerCase().includes(needle))
      return route.fulfill({
        json: filtered,
        headers: {
          'access-control-allow-origin': '*',
          'content-type': 'application/json',
          'x-total-page-count': '1',
        },
      })
    }
    return route.fulfill({
      json: DEALS,
      headers: {
        'access-control-allow-origin': '*',
        'content-type': 'application/json',
        'x-total-page-count': '1',
      },
    })
  })

  await page.route('**/api/1.0/games**', (route) => {
    const url = new URL(route.request().url())
    const gameID = url.searchParams.get('id')
    if (gameID) {
      return route.fulfill({
        json: anyGame(gameID),
        headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
      })
    }
    const title = (url.searchParams.get('title') ?? '').toLowerCase()
    const results = DEALS.filter(
      (deal) => title.length > 0 && deal.title.toLowerCase().includes(title),
    ).map((deal) => ({ gameID: deal.gameID, external: deal.title, thumb: deal.thumb }))
    return route.fulfill({
      json: results,
      headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
    })
  })
}
