import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { resetApiCooldown } from '@/shared/api/client'
import { useRateLimitMinutes } from '@/shared/lib/rateLimit'

/** Предупреждение о временном лимите CheapShark: данные могут не обновиться. */
export function RateLimitBanner() {
  const minutes = useRateLimitMinutes()
  const queryClient = useQueryClient()
  if (minutes === null) return null

  const retry = () => {
    resetApiCooldown()
    void queryClient.invalidateQueries()
  }

  return (
    <output className="card mb-4 flex flex-wrap items-start gap-2 border-caution/30 bg-caution-tint p-3 text-xs text-caution">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span className="flex-1">
        CheapShark временно ограничил запросы (лимит API): часть цен может не обновиться. Повторите
        попытку примерно через {minutes} мин.
      </span>
      <button type="button" className="link shrink-0" onClick={retry}>
        Попробовать снова
      </button>
    </output>
  )
}
