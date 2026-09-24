import type { Deal } from '@/shared/api/schemas'

export function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    internalName: 'TESTGAME',
    title: 'Test Game',
    dealID: 'deal-1',
    storeID: '1',
    gameID: 'game-1',
    salePrice: 9.99,
    normalPrice: 19.99,
    savings: 50,
    metacriticScore: 85,
    steamRatingPercent: 90,
    steamRatingCount: 1000,
    steamAppID: '570',
    releaseDate: 1_600_000_000,
    dealRating: 9.5,
    thumb: 'https://example.com/thumb.jpg',
    ...overrides,
  }
}

export function makeTagIndex() {
  return {
    games: {
      '570': {
        tags: ['MOBA', 'Free to Play', 'Strategy'],
        owners: '50,000,000 .. 100,000,000',
        ccu: 500_000,
      },
      '292030': {
        tags: ['RPG', 'Open World'],
        owners: '20,000,000 .. 50,000,000',
        ccu: 16_000,
      },
    },
    tags: [
      { id: 'moba', label: 'MOBA', count: 1 },
      { id: 'rpg', label: 'RPG', count: 1 },
      { id: 'open world', label: 'Open World', count: 1 },
    ],
  }
}
