import { X } from 'lucide-react'
import type { Store } from '@/shared/api/schemas'
import { toDisplayCurrency, useCurrency } from '@/shared/lib/currency'
import { formatNumber } from '@/shared/lib/format'
import { MAX_PRICE, isQuickMetacritic, isQuickPrice, isQuickSavings, type Filters } from './filters'

const AGE_LABELS: Record<number, string> = {
  7: 'неделю',
  30: 'месяц',
  90: '3 месяца',
  365: 'год',
}

type ActiveFiltersProps = {
  filters: Filters
  stores: Store[]
  setFilters: (patch: Partial<Filters>) => void
  resetFilters: () => void
  toggleTag: (tag: string) => void
}

type Chip = { key: string; label: string; remove: () => void }

/** Строка активных фильтров: каждый можно снять по отдельности. */
export function ActiveFilters({
  filters,
  stores,
  setFilters,
  resetFilters,
  toggleTag,
}: ActiveFiltersProps) {
  const currency = useCurrency()
  const storeNames = new Map(stores.map((store) => [store.storeID, store.storeName]))
  const chips: Chip[] = []

  if (filters.title) {
    chips.push({
      key: 'title',
      label: `Поиск: «${filters.title}»`,
      remove: () => setFilters({ title: '' }),
    })
  }

  for (const storeID of filters.storeIDs) {
    chips.push({
      key: `store-${storeID}`,
      label: `Магазин: ${storeNames.get(storeID) ?? storeID}`,
      remove: () => setFilters({ storeIDs: filters.storeIDs.filter((id) => id !== storeID) }),
    })
  }

  // Значения быстрых пресетов не дублируем — их снимает сам чип-переключатель.
  if ((filters.lowerPrice > 0 || filters.upperPrice !== MAX_PRICE) && !isQuickPrice(filters)) {
    chips.push({
      key: 'price',
      label:
        currency === 'RUB'
          ? `Цена: ≈ ${formatNumber(toDisplayCurrency(filters.lowerPrice))}–${formatNumber(toDisplayCurrency(filters.upperPrice))} ₽`
          : `Цена: $${filters.lowerPrice}–${filters.upperPrice}`,
      remove: () => setFilters({ lowerPrice: 0, upperPrice: MAX_PRICE }),
    })
  }

  if (filters.metacritic > 0 && !isQuickMetacritic(filters)) {
    chips.push({
      key: 'metacritic',
      label: `Metacritic: ${filters.metacritic}+`,
      remove: () => setFilters({ metacritic: 0 }),
    })
  }

  if (filters.steamRating > 0) {
    chips.push({
      key: 'steam',
      label: `Steam: ${filters.steamRating}%+`,
      remove: () => setFilters({ steamRating: 0 }),
    })
  }

  if (filters.maxAge > 0) {
    chips.push({
      key: 'age',
      label: `Изменено за ${AGE_LABELS[filters.maxAge] ?? `${filters.maxAge} дн.`}`,
      remove: () => setFilters({ maxAge: 0 }),
    })
  }

  if (!filters.onSale) {
    chips.push({
      key: 'sale',
      label: 'Включая игры без скидки',
      remove: () => setFilters({ onSale: true }),
    })
  }

  if (filters.minSavings > 0 && !isQuickSavings(filters)) {
    chips.push({
      key: 'savings',
      label: `Скидка от ${filters.minSavings}%`,
      remove: () => setFilters({ minSavings: 0 }),
    })
  }

  for (const tag of filters.tags) {
    chips.push({
      key: `tag-${tag}`,
      label: `Тег: ${tag}`,
      remove: () => toggleTag(tag),
    })
  }

  if (chips.length === 0) return null

  return (
    <ul aria-label="Активные фильтры" className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <li key={chip.key}>
          <button
            type="button"
            className="chip chip-active"
            onClick={chip.remove}
            aria-label={`Убрать фильтр ${chip.label}`}
          >
            {chip.label}
            <X className="size-3" aria-hidden />
          </button>
        </li>
      ))}
      <li>
        <button type="button" className="link text-xs" onClick={resetFilters}>
          Сбросить всё
        </button>
      </li>
    </ul>
  )
}
