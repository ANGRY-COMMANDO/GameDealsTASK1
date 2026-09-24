import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, SearchX } from 'lucide-react'
import { useGameDetails, useGameHistory, useStores, useTagIndex } from '@/shared/api/hooks'
import { isSteamAppId } from '@/shared/api/client'
import { useBackdropImagesStore } from '@/shared/lib/backdrop'
import { useCurrency } from '@/shared/lib/currency'
import { useImageFallback } from '@/shared/lib/useImageFallback'
import { Skeleton } from '@/shared/ui/primitives'
import { GameHeader } from '@/features/game/GameHeader'
import { PriceDynamics } from '@/features/game/PriceDynamics'
import { StoreOffers } from '@/features/game/StoreOffers'

function steamHeader(appID: string | null | undefined) {
  if (!isSteamAppId(appID)) return null
  return `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appID}/header.jpg`
}

export default function GamePage() {
  const { gameID = '' } = useParams()
  // Подписка на смену валюты: цены на странице пересчитываются.
  useCurrency()
  const details = useGameDetails(gameID)
  const storesQuery = useStores()
  const tagIndex = useTagIndex()
  const history = useGameHistory()
  const publishBackdrop = useBackdropImagesStore()

  const storesById = useMemo(
    () => new Map((storesQuery.data ?? []).map((store) => [store.storeID, store])),
    [storesQuery.data],
  )

  const deals = useMemo(
    () => (details.data?.deals ?? []).toSorted((a, b) => a.price - b.price),
    [details.data],
  )

  const tags = useMemo(() => {
    const appID = details.data?.info.steamAppID
    if (!appID || !tagIndex.data) return []
    return (tagIndex.data.games[appID]?.tags ?? []).slice(0, 12)
  }, [details.data, tagIndex.data])

  /** Ряд цен по дням из общего снапшота: для графика на странице игры. */
  const priceSeries = useMemo(() => {
    const points = history.data?.points ?? []
    return points
      .map((point) => ({ date: point.date, price: point.prices[gameID] }))
      .filter((item): item is { date: string; price: number } => typeof item.price === 'number')
  }, [history.data, gameID])

  // Steam-обложка крупнее и чётче; при ошибке подставляем превью CheapShark.
  const steamBanner = steamHeader(details.data?.info.steamAppID)
  const bannerCandidates = useMemo(
    () => [steamBanner, details.data?.info.thumb],
    [steamBanner, details.data],
  )
  const { src: bannerSrc, onError: onBannerError } = useImageFallback(bannerCandidates)

  useEffect(() => {
    publishBackdrop(bannerCandidates)
  }, [bannerCandidates, publishBackdrop])

  if (details.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-44 w-full rounded-lg" />
        <Skeleton className="h-6 w-1/3" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (details.isError || !details.data) {
    return (
      <div className="card mx-auto max-w-lg space-y-3 p-10 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-lg border border-stroke bg-fill-subtle">
          <SearchX className="size-6 text-ink-3" aria-hidden />
        </span>
        <p className="font-display text-lg font-bold">Игра не найдена</p>
        <p className="text-sm text-ink-2">
          {details.error instanceof Error
            ? details.error.message
            : 'Попробуйте вернуться к списку скидок.'}
        </p>
        <Link to="/" viewTransition className="link">
          ← К списку скидок
        </Link>
      </div>
    )
  }

  const { info, cheapestPriceEver } = details.data
  const bestDeal = deals[0]
  const bestSavings = bestDeal?.retailPrice
    ? ((bestDeal.retailPrice - bestDeal.price) / bestDeal.retailPrice) * 100
    : 0
  const lowDeltaPercent =
    bestDeal && cheapestPriceEver.price > 0
      ? Math.round(((bestDeal.price - cheapestPriceEver.price) / cheapestPriceEver.price) * 100)
      : null

  return (
    <div className="space-y-6">
      <Link to="/" viewTransition className="btn btn-ghost -ml-2">
        <ArrowLeft className="size-4" aria-hidden />
        Все скидки
      </Link>

      <GameHeader
        gameID={gameID}
        info={info}
        cheapestPriceEver={cheapestPriceEver}
        tags={tags}
        bestDeal={bestDeal}
        bestSavings={bestSavings}
        dealsCount={deals.length}
        lowDeltaPercent={lowDeltaPercent}
        bannerSrc={bannerSrc}
        bannerIsSteamHeader={bannerSrc === steamBanner}
        onBannerError={onBannerError}
        stats={tagIndex.data?.games[info.steamAppID ?? '']}
      />

      <PriceDynamics title={info.title} series={priceSeries} />

      <StoreOffers deals={deals} storesById={storesById} steamAppID={info.steamAppID} />

      <p className="text-xs text-ink-2">
        Цены обновляются на стороне CheapShark; итоговая стоимость в магазине может отличаться из-за
        региональных цен, налогов и курса валют. Рубли показываются ориентировочно.
      </p>
    </div>
  )
}
