/**
 * Безопасные обёртки над localStorage: приватный режим, отключённое хранилище
 * и переполнение квоты не должны ронять приложение — просто теряем сохранённое.
 */

export function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* приватный режим — игнорируем */
  }
}

/** Читает JSON; undefined — если ключа нет или данные повреждены. */
export function readJson(key: string): unknown {
  const raw = readStorage(key)
  if (raw === null) return undefined
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

export function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* приватный режим или ошибка сериализации — игнорируем */
  }
}
