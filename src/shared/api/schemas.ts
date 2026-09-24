import { z } from 'zod'

/** Число из строки/пустой строки/null с безопасным фолбэком. */
const num = (fallback = 0) => z.coerce.number().catch(fallback)
/** Строка с фолбэком. */
const text = (fallback = '') => z.string().catch(fallback)

const storeSchema = z.object({
  storeID: z.string(),
  storeName: z.string(),
  images: z.object({
    icon: text(),
  }),
})
export type Store = z.infer<typeof storeSchema>

const dealSchema = z.object({
  internalName: text(),
  title: z.string(),
  dealID: z.string(),
  storeID: z.string(),
  gameID: z.string(),
  salePrice: num(),
  normalPrice: num(),
  savings: num(),
  metacriticScore: num(),
  steamRatingPercent: num(),
  steamRatingCount: num(),
  steamAppID: z.string().nullish(),
  releaseDate: num(),
  dealRating: num(),
  thumb: text(),
})
export type Deal = z.infer<typeof dealSchema>

export const dealListSchema = z.array(dealSchema)

export const storeListSchema = z.array(storeSchema)

export const gameSearchResultSchema = z.object({
  gameID: z.string(),
  external: text(),
  thumb: text(),
})

export const gameDetailsSchema = z.object({
  info: z.object({
    title: z.string(),
    steamAppID: z.string().nullish(),
    thumb: text(),
  }),
  cheapestPriceEver: z.object({
    price: num(),
    date: num(),
  }),
  deals: z.array(
    z.object({
      storeID: z.string(),
      dealID: z.string(),
      price: num(),
      retailPrice: num(),
      savings: num(),
    }),
  ),
})
export type GameDetails = z.infer<typeof gameDetailsSchema>
export type GameDeal = GameDetails['deals'][number]

/** Индекс тегов, который собирает CI-скрипт (public/data/tags.json). */
export const tagIndexSchema = z.object({
  games: z.record(
    z.string(),
    z.object({
      tags: z.array(z.string()).catch([]),
      owners: text(),
      ccu: num(),
    }),
  ),
  tags: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        count: num(),
      }),
    )
    .catch([]),
})
export type TagIndex = z.infer<typeof tagIndexSchema>

export const emptyTagIndex: TagIndex = { games: {}, tags: [] }

/** Снапшоты цен, которые ежедневно собирает CI (public/data/price-history.json). */
export const priceHistorySchema = z.object({
  updatedAt: text(),
  points: z
    .array(
      z.object({
        date: z.string(),
        avgPrice: num(),
        medianSavings: num(),
      }),
    )
    .catch([]),
})
export type PriceHistory = z.infer<typeof priceHistorySchema>

export const emptyPriceHistory: PriceHistory = { updatedAt: '', points: [] }

/** Дневные цены по конкретным играм (public/data/game-history.json). */
export const gameHistorySchema = z.object({
  updatedAt: text(),
  points: z
    .array(
      z.object({
        date: z.string(),
        prices: z.record(z.string(), num()).catch({}),
      }),
    )
    .catch([]),
})
export type GameHistory = z.infer<typeof gameHistorySchema>

export const emptyGameHistory: GameHistory = { updatedAt: '', points: [] }
