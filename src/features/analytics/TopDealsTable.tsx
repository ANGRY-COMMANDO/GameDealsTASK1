import { Link } from 'react-router'
import type { Deal } from '@/shared/api/schemas'
import { formatPercent, formatPrice } from '@/shared/lib/format'

type TopDealsTableProps = {
  deals: Deal[]
  storesById: Map<string, string>
  limit?: number
}

/** Таблица лучших сделок выборки: компактная, со ссылками на карточки игр. */
export function TopDealsTable({ deals, storesById, limit = 10 }: TopDealsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-fill-subtle text-left text-xs text-ink-2 uppercase">
          <tr>
            <th className="px-4 py-2 font-medium">Игра</th>
            <th className="px-4 py-2 font-medium">Магазин</th>
            <th className="px-4 py-2 text-right font-medium">Цена</th>
            <th className="px-4 py-2 text-right font-medium">Скидка</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stroke">
          {deals.slice(0, limit).map((deal) => (
            <tr key={deal.dealID} className="transition hover:bg-fill-subtle">
              <td className="max-w-xs truncate px-4 py-2">
                <Link to={`/game/${deal.gameID}`} viewTransition className="link">
                  {deal.title}
                </Link>
              </td>
              <td className="px-4 py-2">{storesById.get(deal.storeID) ?? deal.storeID}</td>
              <td className="px-4 py-2 text-right tabular-nums">{formatPrice(deal.salePrice)}</td>
              <td className="px-4 py-2 text-right font-medium text-success tabular-nums">
                −{formatPercent(deal.savings)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
