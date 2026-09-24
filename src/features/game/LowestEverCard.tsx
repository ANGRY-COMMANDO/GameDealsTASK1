import { TrendingDown } from 'lucide-react'
import { formatDate, formatPrice } from '@/shared/lib/format'

type LowestEverCardProps = {
  price: number
  date: number
  /** Насколько текущая цена выше минимума, % (null — нет данных для сравнения). */
  deltaPercent: number | null
}

/** Исторический минимум цены игры с подсказкой, насколько сейчас дороже. */
export function LowestEverCard({ price, date, deltaPercent }: LowestEverCardProps) {
  return (
    <div className="rounded-lg border border-success/30 bg-success-tint px-4 py-3 shadow-e2">
      <p className="flex items-center gap-1.5 text-xs font-medium text-success">
        <TrendingDown className="size-3.5" aria-hidden />
        Минимум за всё время
      </p>
      <p className="font-display text-2xl font-semibold text-success tabular-nums">
        {formatPrice(price)}
      </p>
      <p className="text-xs text-success/80">{formatDate(date)}</p>
      {deltaPercent !== null && (
        <p className="mt-1 text-xs text-success/80">
          {deltaPercent <= 0
            ? 'Сейчас цена на историческом минимуме'
            : `Сейчас на ${deltaPercent}% выше`}
        </p>
      )}
    </div>
  )
}
