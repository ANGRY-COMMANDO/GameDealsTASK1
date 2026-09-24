import { mkdir, writeFile } from 'node:fs/promises'

const USER_AGENT =
  process.env.HTTP_USER_AGENT ?? 'GameDeals-CI/1.0 (tags index; +https://github.com/)'
const LIMIT = Number(process.env.TAG_INDEX_LIMIT ?? 400)
const STEAM_DELAY_MS = Number(process.env.STEAM_DELAY_MS ?? 1500)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchJson(url, { retries = 2 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(20_000),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } catch (error) {
      if (attempt === retries) throw error
      await sleep(1200 * (attempt + 1))
    }
  }
  return null
}

/** Собираем steamAppID популярных скидок: по ним и строим индекс тегов. */
async function collectGames(limit) {
  const games = new Map()
  for (let page = 1; page <= 12 && games.size < limit; page += 1) {
    const deals = await fetchJson(
      `https://www.cheapshark.com/api/1.0/deals?pageSize=60&pageNumber=${page}&sortBy=Deal%20Rating&desc=true&onSale=1`,
    )
    if (!Array.isArray(deals) || deals.length === 0) break
    for (const deal of deals) {
      const appID = deal.steamAppID
      if (appID && !games.has(appID)) games.set(appID, deal.title)
      if (games.size >= limit) break
    }
    console.log(`  страница ${page}: собрано ${games.size} игр`)
  }
  return games
}

async function steamGenres(appID) {
  const data = await fetchJson(
    `https://store.steampowered.com/api/appdetails?appids=${appID}&filters=genres&l=english`,
  )
  const entry = data?.[appID]
  if (!entry?.success) return []
  return (entry.data?.genres ?? []).map((genre) => genre.description).filter(Boolean)
}

async function steamSpyDetails(appID) {
  const data = await fetchJson(`https://steamspy.com/api.php?request=appdetails&appid=${appID}`)
  const tags =
    data && typeof data.tags === 'object' && data.tags !== null
      ? Object.entries(data.tags)
          .toSorted((a, b) => b[1] - a[1])
          .slice(0, 12)
          .map(([tag]) => tag)
      : []
  return {
    tags,
    owners: typeof data?.owners === 'string' ? data.owners : '',
    ccu: Number.isFinite(data?.ccu) ? Number(data.ccu) : 0,
  }
}

const normalize = (value) => value.trim().replace(/\s+/g, ' ')

async function main() {
  console.log(`Собираем индекс тегов (лимит ${LIMIT} игр)...`)
  const games = await collectGames(LIMIT)
  console.log(`Найдено игр: ${games.size}`)

  const index = {}
  const tagCounts = new Map()
  let processed = 0

  for (const [appID, title] of games) {
    processed += 1
    try {
      const genres = (await steamGenres(appID)).map(normalize)
      await sleep(STEAM_DELAY_MS)
      const spy = await steamSpyDetails(appID)
      await sleep(STEAM_DELAY_MS)

      const merged = [...new Set([...spy.tags.map(normalize), ...genres])]
      if (merged.length === 0) continue
      index[appID] = { tags: merged, owners: spy.owners, ccu: spy.ccu }
      for (const tag of merged) {
        const key = tag.toLowerCase()
        const entry = tagCounts.get(key) ?? { label: tag, count: 0 }
        entry.count += 1
        tagCounts.set(key, entry)
      }
    } catch (error) {
      console.warn(`  ${appID} (${title}): ${error.message}`)
    }

    if (processed % 25 === 0) console.log(`  обработано ${processed}/${games.size}`)
  }

  const tags = [...tagCounts.entries()]
    .map(([id, entry]) => ({ id, label: entry.label, count: entry.count }))
    .toSorted((a, b) => b.count - a.count)
    .slice(0, 80)

  const output = {
    games: index,
    tags,
  }

  await mkdir(new URL('../public/data/', import.meta.url), { recursive: true })
  await writeFile(
    new URL('../public/data/tags.json', import.meta.url),
    `${JSON.stringify(output)}\n`,
    'utf8',
  )
  console.log(`✓ public/data/tags.json: ${Object.keys(index).length} игр, ${tags.length} тегов`)
}

await main()
