import { CalendarDays, ExternalLink } from 'lucide-react'
import { dealTargetUrl, storeImage } from '@/shared/api/client'
import type { GameDeal, Store } from '@/shared/api/schemas'
import { formatPercent, formatPrice } from '@/shared/lib/format'
import { cn } from '@/shared/lib/utils'

type StoreOffersProps = {
  deals: GameDeal[]
  storesById: Map<string, Store>
  steamAppID?: string | null
}

/** Предложения магазинов по игре: лучшая цена подсвечена, полоска — относительная цена. */
export function StoreOffers({ deals, storesById, steamAppID }: StoreOffersProps) {
  const maxPrice = Math.max(...deals.map((deal) => deal.price), 0.01)

  return (
    <section className="card overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-stroke p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <CalendarDays className="size-4 text-accent" aria-hidden />
          Предложения магазинов
        </h2>
        <span className="text-sm text-ink-2">{deals.length} шт.</span>
      </header>

      {deals.length === 0 ? (
        <p className="p-6 text-sm text-ink-2">Сейчас активных предложений нет — загляните позже.</p>
      ) : (
        <ul className="divide-y divide-stroke">
          {deals.map((deal, index) => {
            const store = storesById.get(deal.storeID)
            const savings =
              deal.retailPrice > deal.price
                ? ((deal.retailPrice - deal.price) / deal.retailPrice) * 100
                : 0
            const isBest = index === 0
            return (
              <li
                key={deal.dealID}
                className={cn(
                  'flex items-center gap-3 p-4 transition hover:bg-fill-subtle',
                  isBest && 'bg-success-tint',
                )}
              >
                {store?.images.icon && (
                  <img
                    src={storeImage(store.images.icon)}
                    alt=""
                    width={24}
                    height={24}
                    loading="lazy"
                    decoding="async"
                    className="size-6 rounded"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-medium">
                    {store?.storeName ?? `Магазин ${deal.storeID}`}
                    {isBest && (
                      <span className="rounded-[4px] bg-success-tint px-1.5 py-0.5 text-[10px] font-semibold text-success uppercase">
                        лучшая цена
                      </span>
                    )}
                  </p>
                  <div className="mt-1 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-fill-active">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        savings > 0 ? 'bg-gradient-to-r from-success to-accent' : 'bg-ink-3',
                      )}
                      style={{ width: `${Math.max(4, (deal.price / maxPrice) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">{formatPrice(deal.price)}</p>
                  {savings > 0 && (
                    <p className="text-xs text-ink-3 tabular-nums">
                      <span className="line-through">{formatPrice(deal.retailPrice)}</span>{' '}
                      <span className="text-success">−{formatPercent(savings)}</span>
                    </p>
                  )}
                </div>
                <a
                  href={dealTargetUrl({
                    dealID: deal.dealID,
                    storeID: deal.storeID,
                    steamAppID,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary shrink-0"
                >
                  <span className="hidden sm:inline">В магазин</span>
                  <ExternalLink className="size-4" aria-hidden />
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
