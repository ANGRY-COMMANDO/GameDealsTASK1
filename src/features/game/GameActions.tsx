import { useEffect, useState } from 'react'
import { Heart, Share2 } from 'lucide-react'
import { getFavorite, refreshFavoritePrice, toggleFavorite } from '@/shared/lib/favorites'
import { formatPrice } from '@/shared/lib/format'
import { shareUrl } from '@/shared/lib/share'
import { cn } from '@/shared/lib/utils'

type GameActionsProps = {
  gameID: string
  title: string
  price?: number
}

/**
 * Личные действия на странице игры: избранное, шаринг и «подешевело с прошлого визита».
 * Монтируется с `key={gameID}`, поэтому состояние не нужно сбрасывать эффектом.
 */
export function GameActions({ gameID, title, price }: GameActionsProps) {
  const [favorite, setFavorite] = useState(() => getFavorite(gameID))
  const [priceDrop] = useState(() => {
    const previous = getFavorite(gameID)?.price
    return previous !== undefined && price !== undefined && previous > price
      ? previous - price
      : null
  })
  const [shared, setShared] = useState(false)

  // Запоминаем цену, чтобы при следующем визите показать разницу.
  useEffect(() => {
    if (price !== undefined) refreshFavoritePrice(gameID, price)
  }, [gameID, price])

  const toggle = () => {
    setFavorite(toggleFavorite({ gameID, title, price: price ?? 0 }))
  }

  const share = async () => {
    const result = await shareUrl(window.location.href, `${title} — GameDeals`)
    if (result === 'copied') {
      setShared(true)
      window.setTimeout(() => setShared(false), 2000)
    }
  }

  return (
    <div className="space-y-2">
      {priceDrop !== null && (
        <p className="rounded-lg border border-success/30 bg-success-tint px-3 py-2 text-xs text-success">
          С прошлого визита цена упала на {formatPrice(priceDrop)}.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={cn('btn btn-outline', favorite && 'border-accent text-accent')}
          aria-pressed={Boolean(favorite)}
          onClick={toggle}
        >
          <Heart className={cn('size-4', favorite && 'fill-current')} aria-hidden />
          {favorite ? 'В избранном' : 'В избранное'}
        </button>
        <button type="button" className="btn btn-outline" onClick={() => void share()}>
          <Share2 className="size-4" aria-hidden />
          {shared ? 'Ссылка скопирована' : 'Поделиться'}
        </button>
      </div>
    </div>
  )
}
