import { useState } from 'react'

/**
 * Подбирает рабочую картинку из списка кандидатов: при ошибке загрузки переходит
 * к следующему URL, а когда варианты кончились — возвращает null (компонент рисует
 * заглушку). Избавляет от ручных состояний «какая именно картинка упала».
 */
export function useImageFallback(sources: readonly (string | null | undefined)[]) {
  const list = [...new Set(sources.filter((url): url is string => Boolean(url)))]
  const key = list.join('|')
  const [state, setState] = useState({ key, index: 0 })

  // Смена набора (например, подгрузились детали игры) начинает подбор заново.
  const index = state.key === key ? state.index : 0
  return {
    src: list[index] ?? null,
    onError: () => setState({ key, index: index + 1 }),
  }
}
