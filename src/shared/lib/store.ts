type Listener = () => void

/**
 * Мини-хранилище для `useSyncExternalStore`: держит подписчиков и уведомляет их.
 * Само состояние остаётся в модуле — стор отвечает только за подписку и события.
 */
export function createExternalStore() {
  const listeners = new Set<Listener>()

  return {
    subscribe(listener: Listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    emit() {
      for (const listener of listeners) listener()
    },
  }
}
