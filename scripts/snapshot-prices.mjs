import { mkdir, readFile, writeFile } from 'node:fs/promises'

const USER_AGENT =
  process.env.HTTP_USER_AGENT ?? 'GameDeals-CI/1.0 (price snapshot; +https://github.com/)'
const PAGES = Number(process.env.SNAPSHOT_PAGES ?? 3)
const PAGE_SIZE = 60
const MAX_POINTS = 365
/** Сколько игр из топа попадает в персональную историю цен. */
const GAME_LIMIT = Number(process.env.SNAPSHOT_GAMES ?? 60)
const DELAY_MS = 700

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchDeals(page, attempt = 0) {
  const response = await fetch(
    `https://www.cheapshark.com/api/1.0/deals?pageSize=${PAGE_SIZE}&pageNumber=${page}&sortBy=Deal%20Rating&desc=true&onSale=1`,
    {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    },
  )
  if (response.status === 429 && attempt < 3) {
    const wait = 30_000 * (attempt + 1)
    console.log(`  страница ${page}: 429, ждём ${wait / 1000} с`)
    await sleep(wait)
    return fetchDeals(page, attempt + 1)
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

function median(values) {
  if (values.length === 0) return 0
  const sorted = values.toSorted((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

async function main() {
  // Последовательно и с паузами: CheapShark блокирует всплески запросов.
  const results = []
  for (let page = 1; page <= PAGES; page += 1) {
    results.push(await fetchDeals(page))
    if (page < PAGES) await sleep(DELAY_MS)
  }
  const deals = results.flat()
  if (deals.length === 0) throw new Error('CheapShark не вернул предложения')

  const prices = deals.map((deal) => Number(deal.salePrice)).filter(Number.isFinite)
  const savings = deals.map((deal) => Number(deal.savings)).filter(Number.isFinite)

  const point = {
    date: new Date().toISOString().slice(0, 10),
    avgPrice: Number((prices.reduce((sum, value) => sum + value, 0) / prices.length).toFixed(2)),
    medianSavings: Number(median(savings).toFixed(2)),
  }

  const file = new URL('../public/data/price-history.json', import.meta.url)
  let history = { updatedAt: '', points: [] }
  try {
    history = JSON.parse(await readFile(file, 'utf8'))
  } catch {
    console.log('Файл истории ещё не создан — начинаем с нуля')
  }

  const points = [...history.points.filter((item) => item.date !== point.date), point]
    .toSorted((a, b) => a.date.localeCompare(b.date))
    .slice(-MAX_POINTS)

  await mkdir(new URL('../public/data/', import.meta.url), { recursive: true })
  await writeFile(file, `${JSON.stringify({ updatedAt: point.date, points }, null, 0)}\n`, 'utf8')
  console.log(`✓ публикация снапшота за ${point.date}: ${points.length} точек истории`)

  // Персональная история: цены top-N игр по дням — для графика на странице игры.
  const gameFile = new URL('../public/data/game-history.json', import.meta.url)
  let gameHistory = { updatedAt: '', points: [] }
  try {
    gameHistory = JSON.parse(await readFile(gameFile, 'utf8'))
  } catch {
    console.log('Файл истории игр ещё не создан — начинаем с нуля')
  }

  const prices32 = Object.fromEntries(
    deals
      .filter((deal) => deal.gameID)
      .slice(0, GAME_LIMIT)
      .map((deal) => [deal.gameID, Number(Number(deal.salePrice).toFixed(2))]),
  )
  const gamePoint = { date: point.date, prices: prices32 }
  const gamePoints = [...gameHistory.points.filter((item) => item.date !== point.date), gamePoint]
    .toSorted((a, b) => a.date.localeCompare(b.date))
    .slice(-MAX_POINTS)

  await writeFile(
    gameFile,
    `${JSON.stringify({ updatedAt: point.date, points: gamePoints }, null, 0)}\n`,
    'utf8',
  )
  console.log(
    `✓ game-history.json за ${point.date}: ${Object.keys(prices32).length} игр, ${gamePoints.length} точек`,
  )
}

await main()
