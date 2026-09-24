import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { useIsRateLimited } from '@/shared/lib/rateLimit'
import { cn } from '@/shared/lib/utils'

const COOLDOWN_MS = 60_000

/** Ручное обновление: перезапрашивает активные данные. */
export function RefreshButton() {
  const queryClient = useQueryClient()
  const limited = useIsRateLimited()
  const [busy, setBusy] = useState(false)
  const [cooling, setCooling] = useState(false)

  const refresh = async () => {
    if (busy || cooling || limited) return
    setBusy(true)
    try {
      await queryClient.invalidateQueries()
    } finally {
      setBusy(false)
      setCooling(true)
      window.setTimeout(() => setCooling(false), COOLDOWN_MS)
    }
  }

  return (
    <button
      type="button"
      className="chip"
      onClick={() => void refresh()}
      disabled={busy || cooling || limited}
      title="Обновить данные из CheapShark (не чаще раза в минуту)"
    >
      <RefreshCw className={cn('size-3.5', busy && 'animate-spin')} aria-hidden />
      {busy ? 'Обновляем…' : 'Обновить'}
    </button>
  )
}
