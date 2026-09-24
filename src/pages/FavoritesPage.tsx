import { useState } from 'react'
import { Link } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Trash2 } from 'lucide-react'
import { gameQueryOptions } from '@/shared/api/hooks'
import { useCurrency } from '@/shared/lib/currency'
import { refreshFavoritePrice, toggleFavorite, useFavorites } from '@/shared/lib/favorites'
import { formatDate, formatPrice } from '@/shared/lib/format'
import { useIsRateLimited } from '@/shared/lib/rateLimit'
import { cn } from '@/shared/lib/utils'
import { EmptyState, PageHeader } from '@/shared/ui/primitives'

const SORTS = [
  { value: 'added', label: 'По дате добавления' },
  { value: 'price', label: 'По цене' },
  { value: 'title', label: 'По названию' },
] as const

type SortValue = (typeof SORTS)[number]['value']

export default function FavoritesPage() {
  // Подписка на смену валюты: цены в списке пересчитываются.
  useCurrency()
  const favorites = useFavorites()
  const queryClient = useQueryClient()
  const limited = useIsRateLimited()
  const [sort, setSort] = useState<SortValue>('added')
  const [updating, setUpdating] = useState(false)
  const [drops, setDrops] = useState<Record<string, number>>({})

  // Цены не тянем автоматически: обновляем по кнопке и по одному запросу за раз,
  // чтобы не расходовать лимит CheapShark.
  const updatePrices = async () => {
    if (updating || limited) return
    setUpdating(true)
    const nextDrops: Record<string, number> = {}
    try {
      for (const favorite of favorites) {
        try {
          // oxlint-disable-next-line no-await-in-loop -- намеренно по одному: бережём лимит API
          const details = await queryClient.fetchQuery({
            ...gameQueryOptions(favorite.gameID),
            staleTime: 0,
          })
          const best = details.deals.toSorted((a, b) => a.price - b.price)[0]
          if (!best) continue
          const previous = refreshFavoritePrice(favorite.gameID, best.price)
          if (previous !== undefined && previous > best.price) {
            nextDrops[favorite.gameID] = previous - best.price
          }
        } catch {
          // Скорее всего, сработал лимит — дальше запросы только навредят.
          break
        }
      }
    } finally {
      setDrops(nextDrops)
      setUpdating(false)
    }
  }

  const rows = favorites.toSorted((a, b) => {
    if (sort === 'price') return a.price - b.price
    if (sort === 'title') return a.title.localeCompare(b.title, 'ru')
    return b.savedAt - a.savedAt
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Личный список"
        title="Избранное"
        description="Игры, за которыми вы следите. Цены обновляются по кнопке — бережём лимит API."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-outline h-8 px-3 text-xs"
              onClick={() => void updatePrices()}
              disabled={updating || limited || favorites.length === 0}
              title={limited ? 'CheapShark ограничил запросы — попробуйте позже' : undefined}
            >
              <RefreshCw className={cn('size-3.5', updating && 'animate-spin')} aria-hidden />
              {updating ? 'Обновляем…' : 'Обновить цены'}
            </button>
            <label className="flex items-center gap-2 text-xs text-ink-2">
              Сортировка
              <select
                className="input w-auto py-1.5"
                value={sort}
                onChange={(event) => setSort(event.target.value as SortValue)}
              >
                {SORTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        }
      />

      {favorites.length === 0 ? (
        <EmptyState
          title="В избранном пусто"
          description="Откройте страницу игры и нажмите «В избранное» — она появится здесь, а мы запомним цену."
          action={
            <Link to="/" viewTransition className="btn btn-primary">
              К списку скидок
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((favorite) => (
            <li key={favorite.gameID} className="card flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <Link
                  to={`/game/${favorite.gameID}`}
                  viewTransition
                  className="font-semibold transition duration-100 ease-fluent hover:text-accent"
                >
                  {favorite.title}
                </Link>
                <p className="mt-1 text-xs text-ink-2">
                  Последняя известная цена:{' '}
                  <strong className="text-ink">{formatPrice(favorite.price)}</strong> · добавлено{' '}
                  {formatDate(favorite.savedAt)}
                </p>
                {drops[favorite.gameID] !== undefined && (
                  <p className="mt-1 text-xs text-success">
                    Подешевело на {formatPrice(drops[favorite.gameID])}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="btn btn-ghost shrink-0 text-ink-2 hover:text-critical"
                aria-label={`Убрать из избранного ${favorite.title}`}
                onClick={() =>
                  toggleFavorite({
                    gameID: favorite.gameID,
                    title: favorite.title,
                    price: favorite.price,
                  })
                }
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
