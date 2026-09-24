import { useCallback, useSyncExternalStore } from 'react'
import { createExternalStore } from './store'

/**
 * Мини-хранилище артов для живого фона. Страницы кладут сюда обложки
 * загруженных игр, а <Backdrop /> плавно их показывает. Никаких запросов:
 * используются те же URL, что и в карточках, поэтому браузер отдаёт их из кэша.
 */
const MAX_IMAGES = 8

let images: string[] = []
const store = createExternalStore()

export function setBackdropImages(next: readonly (string | null | undefined)[]) {
  const cleaned: string[] = []
  for (const url of next) {
    if (!url || cleaned.includes(url)) continue
    cleaned.push(url)
    if (cleaned.length >= MAX_IMAGES) break
  }
  if (cleaned.length === images.length && cleaned.every((url, index) => url === images[index])) {
    return
  }
  images = cleaned
  store.emit()
}

export function clearBackdropImages() {
  if (images.length === 0) return
  images = []
  store.emit()
}

function getSnapshot() {
  return images
}

export function useBackdropImages() {
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot)
}

/** Стабильный публикатор артов — удобно звать из useEffect страниц. */
export function useBackdropImagesStore() {
  return useCallback((next: readonly (string | null | undefined)[]) => setBackdropImages(next), [])
}
