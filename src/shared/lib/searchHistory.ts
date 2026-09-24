import { readJson, writeJson } from '@/shared/lib/storage'

const STORAGE_KEY = 'gd-search-history'
const LIMIT = 5
const MIN_LENGTH = 3

/** Недавние поисковые запросы: подсказываются, когда строка поиска пуста. */
export function loadSearchHistory(): string[] {
  const parsed = readJson(STORAGE_KEY)
  if (!Array.isArray(parsed)) return []
  return parsed.filter((item): item is string => typeof item === 'string').slice(0, LIMIT)
}

function persist(items: string[]) {
  writeJson(STORAGE_KEY, items)
  return items
}

export function pushSearchHistory(query: string): string[] {
  const trimmed = query.trim()
  if (trimmed.length < MIN_LENGTH) return loadSearchHistory()
  const rest = loadSearchHistory().filter((item) => item.toLowerCase() !== trimmed.toLowerCase())
  return persist([trimmed, ...rest].slice(0, LIMIT))
}

export function clearSearchHistory(): string[] {
  writeJson(STORAGE_KEY, [])
  return []
}
