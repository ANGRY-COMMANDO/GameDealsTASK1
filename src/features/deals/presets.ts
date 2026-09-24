import { readJson, writeJson } from '@/shared/lib/storage'

const STORAGE_KEY = 'gd-filter-presets'
const LIMIT = 8

export type FilterPreset = {
  id: string
  name: string
  /** Сериализованные фильтры (строка query) — применяются заменой URL. */
  search: string
}

function isPreset(value: unknown): value is FilterPreset {
  if (typeof value !== 'object' || value === null) return false
  const preset = value as Record<string, unknown>
  return (
    typeof preset.id === 'string' &&
    typeof preset.name === 'string' &&
    typeof preset.search === 'string'
  )
}

function persist(presets: FilterPreset[]): FilterPreset[] {
  writeJson(STORAGE_KEY, presets)
  return presets
}

export function loadPresets(): FilterPreset[] {
  const parsed = readJson(STORAGE_KEY)
  if (!Array.isArray(parsed)) return []
  return parsed.filter(isPreset).slice(0, LIMIT)
}

export function savePreset(preset: FilterPreset): FilterPreset[] {
  const rest = loadPresets().filter((item) => item.search !== preset.search)
  return persist([preset, ...rest].slice(0, LIMIT))
}

export function removePreset(id: string): FilterPreset[] {
  return persist(loadPresets().filter((item) => item.id !== id))
}
