import { memo, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { ExternalLink, Star } from 'lucide-react'
import { dealImage, dealTargetUrl } from '@/shared/api/client'
import { gameQueryOptions } from '@/shared/api/hooks'
import { useCurrency } from '@/shared/lib/currency'
import { isRateLimited } from '@/shared/lib/rateLimit'
import { useImageFallback } from '@/shared/lib/useImageFallback'
import type { Deal, Store, TagIndex } from '@/shared/api/schemas'
import { formatPercent, formatPrice, formatYear, metacriticTone } from '@/shared/lib/format'
import { cn } from '@/shared/lib/utils'
import { StoreBadge } from '@/shared/ui/StoreBadge'
import { tagsForDeal } from './filters'

type DealCardProps = {
  deal: Deal
  store?: Store
  index?: TagIndex
  /** Первые карточки грузят обложку с высоким приоритетом — они формируют LCP. */
  priority?: boolean
}

export const DealCard = memo(function DealCard({ deal, store, index, priority }: DealCardProps) {
  // Подписка на смену валюты: пересобирает цены в карточке.
  useCurrency()
  const tags = tagsForDeal(deal, index).slice(0, 3)
  const hasDiscount = deal.savings > 0 && deal.normalPrice > deal.salePrice
  const saving = hasDiscount ? deal.normalPrice - deal.salePrice : 0
  // Обложка Steam крупнее; если не загрузилась — падаем на превью CheapShark.
  const { src: imageSrc, onError: onImageError } = useImageFallback([
    dealImage(deal.thumb),
    deal.thumb,
  ])
  const queryClient = useQueryClient()
  const prefetchTimer = useRef<number | undefined>(undefined)

  // Наведение или фокус заранее тянет данные игры, но с паузой и только если их нет в кэше.
  const prefetchGame = () => {
    if (isRateLimited()) return
    window.clearTimeout(prefetchTimer.current)
    prefetchTimer.current = window.setTimeout(() => {
      const options = gameQueryOptions(deal.gameID)
      if (queryClient.getQueryData(options.queryKey)) return
      void queryClient.prefetchQuery(options)
    }, 500)
  }

  const cancelPrefetch = () => {
    window.clearTimeout(prefetchTimer.current)
  }

  // Если карточка исчезла из ленты, отложенный префетч уже не нужен.
  useEffect(() => () => window.clearTimeout(prefetchTimer.current), [])

  return (
    <article className="card card-hover content-auto group relative flex h-full flex-col overflow-hidden">
      <div
        className="relative aspect-[460/215] overflow-hidden bg-fill-subtle"
        style={{ viewTransitionName: `game-${deal.gameID}` }}
      >
        {!imageSrc ? (
          <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_30%_20%,var(--accent-tint-strong),transparent_60%),radial-gradient(circle_at_75%_80%,rgb(34_211_238/0.18),transparent_55%)]">
            <span className="font-display text-4xl font-semibold text-ink-3">
              {deal.title.slice(0, 1).toUpperCase()}
            </span>
          </div>
        ) : (
          <img
            src={imageSrc}
            alt=""
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'low'}
            decoding="async"
            width={460}
            height={215}
            onError={onImageError}
            className="h-full w-full object-cover transition duration-300 ease-fluent group-hover:scale-[1.03]"
          />
        )}

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent"
        />

        {hasDiscount && (
          <span
            data-testid="discount-badge"
            className="absolute top-2 left-2 rounded-[4px] border border-emerald-400/40 bg-black/55 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-300 backdrop-blur-md"
          >
            −{formatPercent(deal.savings)}
          </span>
        )}

        <span className="absolute top-2 right-2">
          <StoreBadge store={store} />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 leading-snug font-semibold">
          <Link
            to={`/game/${deal.gameID}`}
            viewTransition
            onPointerEnter={prefetchGame}
            onPointerLeave={cancelPrefetch}
            onFocus={prefetchGame}
            onBlur={cancelPrefetch}
            className="transition duration-100 ease-fluent group-hover:text-accent"
          >
            {deal.title}
            {/* Растянутая ссылка: кликабельна вся карточка, а не только заголовок. */}
            <span aria-hidden className="absolute inset-0" />
          </Link>
        </h3>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-2">
          {deal.metacriticScore > 0 && (
            <span className={cn('font-semibold', metacriticTone(deal.metacriticScore))}>
              MC {deal.metacriticScore}
            </span>
          )}
          {deal.steamRatingPercent > 0 && (
            <span className="inline-flex items-center gap-1">
              <Star className="size-3.5 text-amber-400" aria-hidden />
              {deal.steamRatingPercent}% Steam
            </span>
          )}
          {deal.releaseDate > 0 && <span>{formatYear(deal.releaseDate)}</span>}
          {deal.dealRating >= 9 && (
            <span className="rounded-[4px] bg-accent-tint px-1.5 py-0.5 font-semibold text-accent">
              Выгодно {deal.dealRating.toFixed(1)}
            </span>
          )}
        </div>

        {tags.length > 0 && (
          <ul className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-stroke bg-fill-subtle px-2 py-0.5 text-[11px] text-ink-2"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-1">
          <div className="min-w-0">
            <p className="text-[22px] leading-none font-semibold text-ink tabular-nums">
              {formatPrice(deal.salePrice)}
            </p>
            {hasDiscount && (
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs tabular-nums">
                <span className="text-ink-3 line-through">{formatPrice(deal.normalPrice)}</span>
                <span className="font-medium text-success">
                  −{formatPrice(saving, { compact: true })}
                </span>
              </p>
            )}
          </div>
          <a
            href={dealTargetUrl(deal)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary relative z-10 shrink-0 max-sm:w-full"
          >
            В магазин
            <ExternalLink className="size-4" aria-hidden />
          </a>
        </div>
      </div>
    </article>
  )
})
