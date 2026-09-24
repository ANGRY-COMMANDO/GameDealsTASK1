type ShareResult = 'shared' | 'copied' | 'failed'

/** Делится ссылкой: нативный share, иначе копирует адрес в буфер обмена. */
export async function shareUrl(url: string, title?: string): Promise<ShareResult> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share(title ? { url, title } : { url })
      return 'shared'
    } catch {
      // Пользователь отменил диалог — это не ошибка и не повод копировать.
      return 'failed'
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}
