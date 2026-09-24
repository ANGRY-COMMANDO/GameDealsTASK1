import { useSyncExternalStore } from 'react'
import { readJson, writeJson } from './storage'
import { createExternalStore } from './store'

type FavoriteEntry = {
  gameID: string
  title: string
  /** Цена на момент последнего визита — чтобы показать «подешевело». */
  price: number
  savedAt: number
}

const STORAGE_KEY = 'gd-favorites'

function isEntry(value: unknown): value is FavoriteEntry {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Record<string, unknown>
  return (
    typeof entry.gameID === 'string' &&
    typeof entry.title === 'string' &&
    typeof entry.price === 'number' &&
    typeof entry.savedAt === 'number'
  )
}

function readAll(): Record<string, FavoriteEntry> {
  const parsed = readJson(STORAGE_KEY)
  if (typeof parsed !== 'object' || parsed === null) return {}
  return Object.fromEntries(
    Object.entries(parsed as Record<string, unknown>).filter(([, value]) => isEntry(value)),
  ) as Record<string, FavoriteEntry>
}

function writeAll(next: Record<string, FavoriteEntry>) {
  writeJson(STORAGE_KEY, next)
}

export function getFavorite(gameID: string): FavoriteEntry | undefined {
  return readAll()[gameID]
}

/** Добавляет или убирает игру из избранного, возвращая новое состояние. */
export function toggleFavorite(entry: Omit<FavoriteEntry, 'savedAt'>): FavoriteEntry | undefined {
  const all = readAll()
  if (all[entry.gameID]) {
    delete all[entry.gameID]
    writeAll(all)
    emit()
    return undefined
  }
  const next: FavoriteEntry = { ...entry, savedAt: Date.now() }
  all[entry.gameID] = next
  writeAll(all)
  emit()
  return next
}

/** Запоминает текущую цену и возвращает прежнюю — для индикатора «подешевело». */
export function refreshFavoritePrice(gameID: string, price: number): number | undefined {
  const all = readAll()
  const entry = all[gameID]
  if (!entry) return undefined
  const previous = entry.price
  if (previous === price) return previous
  all[gameID] = { ...entry, price }
  writeAll(all)
  emit()
  return previous
}

/** Подписка для useSyncExternalStore: избранное меняется с нескольких экранов. */
const store = createExternalStore()
let snapshot: FavoriteEntry[] | null = null
const EMPTY: FavoriteEntry[] = []

function emit() {
  snapshot = null
  store.emit()
}

function getSnapshot(): FavoriteEntry[] {
  snapshot ??= Object.values(readAll())
  return snapshot
}

export function useFavorites(): FavoriteEntry[] {
  return useSyncExternalStore(store.subscribe, getSnapshot, () => EMPTY)
}

// Изменения из другой вкладки браузера тоже подхватываем.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) emit()
  })
}
