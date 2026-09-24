import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/shared/api/client'

/**
 * Единый QueryClient приложения. Вынесен отдельно, чтобы route-loader'ы
 * могли прогревать кэш до рендера страницы, не создавая второго клиента.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Цены CheapShark обновляются нечасто: час кэша экономит лимит запросов.
      staleTime: 60 * 60_000,
      gcTime: 24 * 60 * 60_000,
      refetchOnWindowFocus: false,
      // Мигание сети не должно вызывать всплеск запросов.
      refetchOnReconnect: false,
      // Сначала отдаём кэш, даже если браузер офлайн, и обновляем в фоне.
      networkMode: 'offlineFirst',
      retry: (failureCount, error) => {
        // 400 и 429 от CheapShark — не временные: повторять бессмысленно.
        if (error instanceof ApiError && (error.status === 400 || error.status === 429)) {
          return false
        }
        // Одна повторная попытка, а не три: сбой не должен усиливать лимит.
        return failureCount < 1
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
  },
})
