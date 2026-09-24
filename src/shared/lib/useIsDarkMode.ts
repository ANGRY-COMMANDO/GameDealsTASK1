import { useSyncExternalStore } from 'react'

const listeners = new Set<() => void>()
let observer: MutationObserver | null = null

function subscribe(listener: () => void) {
  listeners.add(listener)
  observer ??= new MutationObserver(() => {
    for (const item of listeners) item()
  })
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      observer?.disconnect()
      observer = null
    }
  }
}

function getSnapshot() {
  return document.documentElement.classList.contains('dark')
}

/** Реакция на смену темы (класс .dark на <html>) без prop drilling. */
export function useIsDarkMode() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
