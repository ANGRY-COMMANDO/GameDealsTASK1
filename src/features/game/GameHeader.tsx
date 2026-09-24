import { Gamepad2, Sparkles, Users } from 'lucide-react'
import { isSteamAppId, steamStoreUrl } from '@/shared/api/client'
import type { GameDeal, GameDetails } from '@/shared/api/schemas'
import { formatPercent, plural } from '@/shared/lib/format'
import { cn } from '@/shared/lib/utils'
import { GameActions } from './GameActions'
import { LowestEverCard } from './LowestEverCard'

type GameHeaderProps = {
  gameID: string
  info: GameDetails['info']
  cheapestPriceEver: GameDetails['cheapestPriceEver']
  tags: string[]
  bestDeal?: GameDeal
  bestSavings: number
  dealsCount: number
  lowDeltaPercent: number | null
  bannerSrc: string | null
  /** Steam-обложка считается основной: остальные варианты показываются приглушённо. */
  bannerIsSteamHeader: boolean
  onBannerError: () => void
  /** Владельцы и онлайн из индекса SteamSpy (public/data/tags.json). */
  stats?: { owners: string; ccu: number }
}

/** Шапка страницы игры: обложка, название, ссылки, теги, избранное и исторический минимум. */
export function GameHeader({
  gameID,
  info,
  cheapestPriceEver,
  tags,
  bestDeal,
  bestSavings,
  dealsCount,
  lowDeltaPercent,
  bannerSrc,
  bannerIsSteamHeader,
  onBannerError,
  stats,
}: GameHeaderProps) {
  const storesWord = plural(dealsCount, 'магазина', 'магазинов', 'магазинов')

  return (
    <header className="card overflow-hidden">
      {bannerSrc && (
        <div
          className="relative aspect-[460/120] bg-gradient-to-r from-accent to-accent-pressed sm:aspect-[920/180]"
          style={{ viewTransitionName: `game-${gameID}` }}
        >
          <img
            src={bannerSrc}
            alt=""
            loading="eager"
            fetchPriority="high"
            decoding="async"
            onError={onBannerError}
            className={cn(
              'h-full w-full object-cover',
              bannerIsSteamHeader ? 'opacity-95' : 'opacity-75',
            )}
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"
          />
        </div>
      )}
      <div className="space-y-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <p className="section-eyebrow">Карточка игры</p>
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">{info.title}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-2">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="size-4 text-accent" aria-hidden />
                {bestDeal
                  ? `Лучшее предложение: −${formatPercent(bestSavings)} среди ${dealsCount} ${storesWord}`
                  : 'Сейчас активных скидок нет'}
              </span>
              {isSteamAppId(info.steamAppID) && (
                <a
                  className="link inline-flex items-center gap-1.5"
                  href={steamStoreUrl(info.steamAppID)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Gamepad2 className="size-4" aria-hidden />
                  Страница в Steam
                </a>
              )}
              {stats && (stats.owners || stats.ccu > 0) && (
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-4 text-accent" aria-hidden />
                  {stats.owners
                    ? `Владельцев: ${stats.owners}`
                    : `Сейчас играют: ${stats.ccu.toLocaleString('ru-RU')}`}
                </span>
              )}
            </div>
          </div>

          <LowestEverCard
            price={cheapestPriceEver.price}
            date={cheapestPriceEver.date}
            deltaPercent={lowDeltaPercent}
          />
        </div>

        {tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-stroke bg-fill-subtle px-2.5 py-1 text-xs text-ink-2"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}

        <GameActions key={gameID} gameID={gameID} title={info.title} price={bestDeal?.price} />
      </div>
    </header>
  )
}
