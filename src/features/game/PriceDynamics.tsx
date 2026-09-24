import { TrendingDown } from 'lucide-react'
import { Sparkline } from '@/shared/ui/Sparkline'

type PriceDynamicsProps = {
  title: string
  /** Ряд цен по дням из снапшотов проекта. */
  series: Array<{ date: string; price: number }>
}

/** График динамики цены: рисуется, только когда есть хотя бы две точки. */
export function PriceDynamics({ title, series }: PriceDynamicsProps) {
  if (series.length < 2) return null

  return (
    <section className="card space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <TrendingDown className="size-4 text-accent" aria-hidden />
          Динамика цены
        </h2>
        <span className="text-xs text-ink-2 tabular-nums">
          {series[0]?.date} — {series.at(-1)?.date}
        </span>
      </div>
      <Sparkline
        values={series.map((item) => item.price)}
        label={`История цены: ${title}`}
        className="h-20 w-full"
      />
    </section>
  )
}
