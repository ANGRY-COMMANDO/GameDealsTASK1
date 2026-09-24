import { useCurrency } from '@/shared/lib/currency'
import { formatPrice } from '@/shared/lib/format'
import { cn } from '@/shared/lib/utils'
import {
  MAX_PRICE,
  QUICK_PRESETS,
  isQuickMetacritic,
  isQuickPrice,
  isQuickSavings,
  type Filters,
} from './filters'

type QuickFiltersProps = {
  filters: Filters
  setFilters: (patch: Partial<Filters>) => void
}

/** Быстрые переключатели над лентой: те же фильтры, но в один клик. */
export function QuickFilters({ filters, setFilters }: QuickFiltersProps) {
  // Подписка на валюту: подпись цены пересчитывается в рублях.
  const currency = useCurrency()

  const savings = isQuickSavings(filters)
  const price = isQuickPrice(filters)
  const metacritic = isQuickMetacritic(filters)

  const chips = [
    {
      key: 'savings',
      label: `Скидка ≥ ${QUICK_PRESETS.minSavings}%`,
      active: savings,
      toggle: () => setFilters({ minSavings: savings ? 0 : QUICK_PRESETS.minSavings }),
    },
    {
      key: 'price',
      label:
        currency === 'RUB'
          ? `До ${formatPrice(QUICK_PRESETS.upperPrice)}`
          : `До $${QUICK_PRESETS.upperPrice}`,
      active: price,
      toggle: () => setFilters({ upperPrice: price ? MAX_PRICE : QUICK_PRESETS.upperPrice }),
    },
    {
      key: 'metacritic',
      label: `Metacritic ${QUICK_PRESETS.metacritic}+`,
      active: metacritic,
      toggle: () => setFilters({ metacritic: metacritic ? 0 : QUICK_PRESETS.metacritic }),
    },
    {
      key: 'aaa',
      label: 'AAA',
      active: filters.aaa,
      toggle: () => setFilters({ aaa: !filters.aaa }),
    },
  ]

  return chips.map((chip) => (
    <button
      key={chip.key}
      type="button"
      className={cn('chip', chip.active && 'chip-active')}
      aria-pressed={chip.active}
      onClick={chip.toggle}
    >
      {chip.label}
    </button>
  ))
}
