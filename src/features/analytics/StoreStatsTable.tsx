import { TrendingDown } from 'lucide-react'
import { formatPercent, formatPrice } from '@/shared/lib/format'
import type { StoreStat } from './stats'

/** Сводка по магазинам выборки: сколько предложений и какие средние. */
export function StoreStatsTable({ rows }: { rows: StoreStat[] }) {
  return (
    <section className="card overflow-hidden">
      <header className="flex items-center gap-2 border-b border-stroke p-4">
        <TrendingDown className="size-4 text-success" aria-hidden />
        <h2 className="font-semibold">Магазины в выборке</h2>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-fill-subtle text-left text-xs text-ink-2 uppercase">
            <tr>
              <th className="px-4 py-2 font-medium">Магазин</th>
              <th className="px-4 py-2 text-right font-medium">Предложений</th>
              <th className="px-4 py-2 text-right font-medium">Средняя скидка</th>
              <th className="px-4 py-2 text-right font-medium">Средняя цена</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stroke">
            {rows.map((row) => (
              <tr key={row.storeID} className="transition hover:bg-fill-subtle">
                <td className="px-4 py-2">{row.name}</td>
                <td className="px-4 py-2 text-right tabular-nums">{row.count}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatPercent(row.avgSavings, 1)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{formatPrice(row.avgPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
