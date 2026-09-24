import type { z } from 'zod'
import { clearRateLimit, getRateLimitUntil, setRateLimitUntil } from '@/shared/lib/rateLimit'
import {
  dealListSchema,
  gameDetailsSchema,
  gameSearchResultSchema,
  storeListSchema,
} from './schemas'

const API_BASE = 'https://www.cheapshark.com/api/1.0'
const STORE_REDIRECT = 'https://www.cheapshark.com/redirect'
const STORE_IMAGE_BASE = 'https://www.cheapshark.com'

/** Размер страницы /deals по умолчанию; используют и хуки, и страницы. */
export const DEALS_PAGE_SIZE = 60
/** Сортировка по умолчанию — совпадает с первым пунктом SORT_OPTIONS. */
export const DEFAULT_SORT_BY = 'Deal Rating'

const TIMEOUT_MS = 15_000
/** Строго по одному запросу с паузой: меньше похоже на бота и реже ловим лимит. */
const MAX_CONCURRENT = 1
const MIN_GAP_MS = 1000
/** Если пауза после лимита длиннее этого порога, запросы не ждём, а сразу сообщаем. */
const FAIL_FAST_COOLDOWN_MS = 5_000
/** Сетевой сбой или блокировка: держим паузу до следующей попытки. */
const NETWORK_COOLDOWN_MS = 60_000

export class ApiError extends Error {
  readonly status: number
  readonly url: string

  constructor(message: string, status: number, url: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.url = url
  }
}

function rateLimitMessage(waitMs: number) {
  const minutes = Math.max(1, Math.ceil(waitMs / 60_000))
  return `CheapShark временно ограничил запросы (лимит API). Попробуйте примерно через ${minutes} мин.`
}

function sleep(ms: number) {
  const { promise, resolve } = Promise.withResolvers<void>()
  setTimeout(resolve, ms)
  return promise
}

/**
 * CheapShark блокирует клиента при всплеске запросов и отвечает 400/429 без CORS-заголовков,
 * что в браузере выглядит как непонятная сетевая ошибка. Поэтому все запросы проходят
 * через семафор: по одному за раз и с небольшой паузой.
 */
class ApiGate {
  private active = 0
  private cooldownUntil = 0
  private generation = 0
  private readonly waiters: Array<() => void> = []

  constructor(
    private readonly limit: number,
    private readonly minGapMs: number,
  ) {}

  /** После блокировки или сетевого сбоя притормаживаем все запросы, чтобы не усугублять. */
  cooldown(ms: number) {
    const next = Date.now() + ms
    if (next <= this.cooldownUntil) return
    this.cooldownUntil = next
    setRateLimitUntil(next)
  }

  /** 429: уважаем Retry-After (не больше часа), иначе держим минутную паузу. */
  cooldownFromResponse(response: Response) {
    const seconds = Number(response.headers.get('retry-after'))
    this.cooldown(Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 3600) * 1000 : 60_000)
  }

  remainingCooldownMs() {
    return Math.max(0, this.cooldownUntil - Date.now())
  }

  /** Снимает карантин вручную, не трогая учёт запросов в полёте. */
  clearCooldown() {
    this.cooldownUntil = 0
    clearRateLimit()
  }

  /** Полный сброс состояния — только для тестов. */
  reset() {
    this.generation += 1
    this.active = 0
    this.cooldownUntil = 0
    this.waiters.length = 0
    clearRateLimit()
  }

  /** Ждёт короткую паузу; при долгой сразу бросает ошибку, чтобы не морозить интерфейс. */
  private async waitCooldown() {
    const wait = this.remainingCooldownMs()
    if (wait <= 0) return
    if (wait > FAIL_FAST_COOLDOWN_MS) throw new ApiError(rateLimitMessage(wait), 429, '')
    await sleep(wait)
  }

  private async acquire() {
    const generation = this.generation
    while (this.active >= this.limit) {
      const { promise, resolve } = Promise.withResolvers<void>()
      this.waiters.push(resolve)
      // oxlint-disable-next-line no-await-in-loop -- так и задумано: ждём освобождения слота
      await promise
      // Сброс семафора (тесты): устаревший запрос не должен выйти в сеть.
      if (generation !== this.generation) throw new DOMException('Aborted', 'AbortError')
    }
    this.active += 1
  }

  private release() {
    this.active -= 1
    const next = this.waiters.shift()
    if (next) {
      setTimeout(next, this.minGapMs)
    }
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.waitCooldown()
    await this.acquire()
    try {
      // Пока запрос стоял в очереди, мог прийти 429: не выпускаем его в сеть впустую.
      await this.waitCooldown()
      return await task()
    } finally {
      this.release()
    }
  }
}

const apiGate = new ApiGate(MAX_CONCURRENT, MIN_GAP_MS)

// После перезагрузки не стучимся в API повторно: восстанавливаем карантин из localStorage.
const storedLimitUntil = getRateLimitUntil()
if (storedLimitUntil > Date.now()) apiGate.cooldown(storedLimitUntil - Date.now())

/** Сброс семафора между тестами. */
export function resetApiGateForTests() {
  apiGate.reset()
  // Отменяем и незавершённые общие запросы, чтобы следующий тест не подцепил их.
  for (const entry of inFlight.values())
    entry.abort.abort(new DOMException('Aborted', 'AbortError'))
  inFlight.clear()
}

/** Снимает карантин вручную — кнопка «Попробовать снова» в баннере лимита. */
export function resetApiCooldown() {
  apiGate.clearCooldown()
}

type RequestOptions = {
  signal?: AbortSignal
}

/**
 * Имя ошибки: fetch и AbortSignal бросают DOMException, который не является
 * `instanceof Error`, поэтому проверять нужно по имени.
 */
function causeName(cause: unknown) {
  if (typeof cause !== 'object' || cause === null || !('name' in cause)) return ''
  return String((cause as { name: unknown }).name)
}

/** Отмена запроса (смена фильтров, уход со страницы) — не ошибка и не повод тормозить API. */
function isAbortError(cause: unknown) {
  return causeName(cause) === 'AbortError'
}

function networkError(url: string, cause: unknown) {
  if (causeName(cause) === 'TimeoutError') {
    apiGate.cooldown(NETWORK_COOLDOWN_MS)
    return new ApiError('Сервис CheapShark не ответил вовремя', 0, url)
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    // Офлайн-режим: запросы бессмысленны, но и «наказывать» API не за что.
    return new ApiError('Нет подключения к интернету — показаны сохранённые данные', 0, url)
  }
  // При ограничении частоты CheapShark отвечает 400/429 без CORS-заголовков — в браузере это
  // выглядит как сетевая ошибка, поэтому держим паузу перед следующими попытками.
  apiGate.cooldown(NETWORK_COOLDOWN_MS)
  return new ApiError(
    'CheapShark временно недоступен: возможно, сработало ограничение по частоте запросов. Повторите позже.',
    0,
    url,
  )
}

type SharedRequest = {
  promise: Promise<Response>
  abort: AbortController
  /** Сколько подписчиков ещё ждёт ответ: отмена последнего рвёт и сетевой запрос. */
  refs: number
}

/**
 * Одинаковые запросы в полёте переиспользуются: один URL — один поход в сеть.
 * У общего запроса собственный AbortController, поэтому отмена одного подписчика
 * (смена фильтра, уход со страницы) не рвёт запрос остальным.
 */
const inFlight = new Map<string, SharedRequest>()

function createEntry(url: string): SharedRequest {
  const abort = new AbortController()
  const entry: SharedRequest = {
    abort,
    refs: 0,
    promise: apiGate
      .run(() => fetch(url, { signal: abort.signal, headers: { Accept: 'application/json' } }))
      .finally(() => {
        if (inFlight.get(url) === entry) inFlight.delete(url)
      }),
  }
  inFlight.set(url, entry)
  return entry
}

function gatedFetch(url: string, signal: AbortSignal): Promise<Response> {
  const entry = inFlight.get(url) ?? createEntry(url)
  entry.refs += 1

  return new Promise<Response>((resolve, reject) => {
    const reason =
      signal.reason instanceof Error ? signal.reason : new DOMException('Aborted', 'AbortError')
    const onAbort = () => {
      entry.refs -= 1
      if (entry.refs === 0) {
        entry.abort.abort(reason)
        // Отменённый запрос убираем сразу, чтобы следующий не подцепил его из карты.
        inFlight.delete(url)
      }
      reject(reason)
    }

    if (signal.aborted) {
      onAbort()
      return
    }
    signal.addEventListener('abort', onAbort, { once: true })
    void (async () => {
      try {
        const response = await entry.promise
        signal.removeEventListener('abort', onAbort)
        resolve(response)
      } catch (error) {
        signal.removeEventListener('abort', onAbort)
        reject(error)
      }
    })()
  })
}

/** Общий путь всех запросов: таймаут, отмена, семафор и понятные ошибки. */
async function gatedRequest(url: string, options: RequestOptions = {}): Promise<Response> {
  const timeout = AbortSignal.timeout(TIMEOUT_MS)
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout
  try {
    return await gatedFetch(url, signal)
  } catch (cause) {
    if (isAbortError(cause)) throw cause
    if (cause instanceof ApiError) throw cause
    throw networkError(url, cause)
  }
}

/** Ошибки HTTP: 429 уважает Retry-After, 400 подсказывает про параметры фильтра. */
function assertOk(response: Response, url: string) {
  if (response.ok) return
  if (response.status === 429) {
    apiGate.cooldownFromResponse(response)
    throw new ApiError(rateLimitMessage(apiGate.remainingCooldownMs()), 429, url)
  }
  const message =
    response.status === 400
      ? 'CheapShark отклонил запрос (проверьте параметры фильтра)'
      : `CheapShark вернул ошибку ${response.status}`
  throw new ApiError(message, response.status, url)
}

async function parseJson<T>(response: Response, url: string, schema: z.ZodType<T>): Promise<T> {
  const json: unknown = await response.json().catch(() => null)
  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    throw new ApiError('CheapShark вернул неожиданный формат данных', 0, url)
  }
  return parsed.data
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {},
): Promise<T> {
  const url = `${API_BASE}${path}`
  const response = await gatedRequest(url, options)
  assertOk(response, url)
  return parseJson(response, url, schema)
}

export async function fetchStores(options?: RequestOptions) {
  return request('/stores', storeListSchema, options)
}

export type DealsPageQuery = {
  pageNumber?: number
  pageSize?: number
  storeID?: string
  upperPrice?: number
  lowerPrice?: number
  metacritic?: number
  steamRating?: number
  maxAge?: number
  onSale?: boolean
  AAA?: boolean
  title?: string
  sortBy?: string
  desc?: boolean
  steamAppID?: string
}

export type DealsPage = {
  deals: z.infer<typeof dealListSchema>
  totalPages: number
}

/**
 * CheapShark понимает только `desc=1`, причём переворачивает дефолтный порядок сортировки,
 * а не задаёт убывание. Дефолты у разных полей различаются, поэтому направления маппим сами.
 */
const DESCENDING_BY_DEFAULT = new Set([
  DEFAULT_SORT_BY,
  'Savings',
  'Release',
  'Metacritic',
  'Reviews',
  'Last Change',
])

function sortDirection(sortBy: string | undefined, desc: boolean | undefined) {
  if (!sortBy || desc === undefined) return undefined
  return DESCENDING_BY_DEFAULT.has(sortBy) === desc ? undefined : '1'
}

export async function fetchDealsPage(
  query: DealsPageQuery,
  options?: RequestOptions,
): Promise<DealsPage> {
  const params = new URLSearchParams()
  params.set('pageSize', String(query.pageSize ?? DEALS_PAGE_SIZE))
  // Особенность CheapShark: `title` вместе с `pageNumber` всегда даёт пустой ответ.
  // Поэтому поиск по названию идёт одной страницей без постраничной навигации.
  if (query.pageNumber !== undefined && !query.title)
    params.set('pageNumber', String(query.pageNumber))
  if (query.storeID) params.set('storeID', query.storeID)
  if (query.upperPrice !== undefined) params.set('upperPrice', String(query.upperPrice))
  if (query.lowerPrice !== undefined && query.lowerPrice > 0)
    params.set('lowerPrice', String(query.lowerPrice))
  if (query.metacritic !== undefined && query.metacritic > 0)
    params.set('metacritic', String(query.metacritic))
  if (query.steamRating !== undefined && query.steamRating > 0)
    params.set('steamRating', String(query.steamRating))
  if (query.maxAge !== undefined && query.maxAge > 0) params.set('maxAge', String(query.maxAge))
  if (query.onSale) params.set('onSale', '1')
  if (query.AAA) params.set('AAA', '1')
  if (query.title) params.set('title', query.title)
  if (query.sortBy) params.set('sortBy', query.sortBy)
  const direction = sortDirection(query.sortBy, query.desc)
  if (direction) params.set('desc', direction)
  if (query.steamAppID) params.set('steamAppID', query.steamAppID)

  const url = `${API_BASE}/deals?${params.toString()}`
  const response = await gatedRequest(url, options)
  const totalPages = Number(response.headers.get('X-Total-Page-Count') ?? '1')
  assertOk(response, url)
  const deals = await parseJson(response, url, dealListSchema)
  return { deals, totalPages: Number.isFinite(totalPages) ? totalPages : 1 }
}

export async function fetchGameDetails(gameID: string, options?: RequestOptions) {
  return request(`/games?id=${encodeURIComponent(gameID)}`, gameDetailsSchema, options)
}

/** Поиск игр по названию — для подсказок в строке поиска. */
export async function fetchGameSearch(title: string, options?: RequestOptions) {
  return request(
    `/games?title=${encodeURIComponent(title)}&limit=8`,
    gameSearchResultSchema.array(),
    options,
  )
}

/**
 * CheapShark отдаёт dealID уже percent-encoded (`%2B`, `%3D`, `%2F`), поэтому
 * повторно кодировать его нельзя — иначе редирект уходит с `%252B`/`%253D` и
 * CheapShark не понимает ссылку. Нормализуем: decode → encode ровно один раз.
 */
function encodeDealID(dealID: string) {
  try {
    return encodeURIComponent(decodeURIComponent(dealID))
  } catch {
    // Невалидная escape-последовательность — значит, `%` в идентификаторе литеральный.
    return encodeURIComponent(dealID)
  }
}

function dealUrl(dealID: string) {
  return `${STORE_REDIRECT}?dealID=${encodeDealID(dealID)}`
}

const STEAM_STORE_ID = '1'

export function isSteamAppId(value: string | null | undefined): value is string {
  return Boolean(value && /^\d{1,10}$/.test(value))
}

export function steamStoreUrl(appID: string) {
  return `https://store.steampowered.com/app/${appID}/`
}

/**
 * Куда ведёт кнопка «В магазин»: для Steam с известным appID — сразу в магазин,
 * для остальных — редирект CheapShark (прямых URL магазинов API не отдаёт).
 */
export function dealTargetUrl(deal: {
  dealID: string
  storeID: string
  steamAppID?: string | null
}) {
  if (deal.storeID === STEAM_STORE_ID && isSteamAppId(deal.steamAppID)) {
    return steamStoreUrl(deal.steamAppID)
  }
  return dealUrl(deal.dealID)
}

export function storeImage(path: string) {
  return path.startsWith('http') ? path : `${STORE_IMAGE_BASE}${path}`
}

/**
 * Steam-обложка карточки: `header.jpg` (460×215) ровно повторяет aspect карточки
 * и выглядит заметно чётче, чем `capsule_231x87` (231×87), который приходится кадрировать.
 */
export function dealImage(thumb: string) {
  if (!thumb.includes('/store_item_assets/')) return thumb
  return thumb.replace(/capsule_\d+x\d+(\.\w+)$/, 'header$1')
}
