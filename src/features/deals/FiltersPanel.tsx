import { useState, type CSSProperties, type ReactNode } from 'react'
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  CalendarClock,
  Coins,
  Gauge,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Store as StoreIcon,
} from 'lucide-react'
import type { Store, TagIndex } from '@/shared/api/schemas'
import { cn } from '@/shared/lib/utils'
import { NumberField, PriceRange, Switch } from '@/shared/ui/controls'
import { TagPicker } from '@/features/tags/TagPicker'
import { MAX_PRICE, SORT_OPTIONS, type Filters } from './filters'
import { fromDisplayCurrency, toDisplayCurrency, useCurrency } from '@/shared/lib/currency'
import { formatNumber } from '@/shared/lib/format'
import { PresetsSection } from './PresetsSection'

function Field({
  label,
  hint,
  icon,
  children,
}: {
  label: string
  hint?: string
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-2">
        {icon}
        {label}
      </span>
      {children}
      {hint && <span className="block text-xs text-ink-3">{hint}</span>}
    </label>
  )
}

type FiltersPanelProps = {
  filters: Filters
  stores: Store[]
  tagIndex?: TagIndex
  setFilters: (patch: Partial<Filters>) => void
  resetFilters: () => void
  applyPreset: (search: string) => void
  toggleTag: (tag: string) => void
  className?: string
  /** В шторке заголовок уже есть в шапке диалога — оставляем только кнопку сброса. */
  showTitle?: boolean
}

export function FiltersPanel({
  filters,
  stores,
  tagIndex,
  setFilters,
  resetFilters,
  applyPreset,
  toggleTag,
  className,
  showTitle = true,
}: FiltersPanelProps) {
  // Пересоздаём числовые поля при сбросе фильтров, чтобы локальный ввод не остался в «старом» виде.
  const [resetToken, setResetToken] = useState(0)
  const currency = useCurrency()
  const savingsPercent = (filters.minSavings / 95) * 100

  // В фильтре показываем цену в выбранной валюте, а в URL/API храним доллары.
  const displayLower = Math.round(toDisplayCurrency(filters.lowerPrice))
  const displayUpper = Math.round(toDisplayCurrency(filters.upperPrice))
  const displayMax = Math.round(toDisplayCurrency(MAX_PRICE))
  const commitRange = ([lower, upper]: [number, number]) => {
    const lo = Math.min(fromDisplayCurrency(lower), fromDisplayCurrency(upper))
    const hi = Math.max(fromDisplayCurrency(lower), fromDisplayCurrency(upper))
    setFilters({
      lowerPrice: Math.round(lo * 100) / 100,
      upperPrice: Math.round(hi * 100) / 100,
    })
  }

  const bumpResetToken = () => setResetToken((value) => value + 1)

  return (
    <div className={cn('space-y-5', className)}>
      <div className={cn('flex items-center gap-2', showTitle ? 'justify-between' : 'justify-end')}>
        {showTitle && (
          <h2 className="flex items-center gap-2 font-semibold">
            <SlidersHorizontal className="size-4 text-accent" aria-hidden />
            Фильтры
          </h2>
        )}
        <button
          type="button"
          className="btn btn-ghost h-7 px-2 text-xs"
          onClick={() => {
            bumpResetToken()
            resetFilters()
          }}
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Сбросить
        </button>
      </div>

      <Field label="Сортировка" icon={<Sparkles className="size-3.5 text-accent" aria-hidden />}>
        <div className="flex gap-2">
          <select
            className="input"
            value={filters.sortBy}
            onChange={(event) => setFilters({ sortBy: event.target.value as Filters['sortBy'] })}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-outline shrink-0 px-2"
            onClick={() => setFilters({ desc: !filters.desc })}
            title={filters.desc ? 'По убыванию' : 'По возрастанию'}
            aria-label={filters.desc ? 'Переключить на возрастание' : 'Переключить на убывание'}
          >
            {filters.desc ? (
              <ArrowDownWideNarrow className="size-4" aria-hidden />
            ) : (
              <ArrowUpNarrowWide className="size-4" aria-hidden />
            )}
          </button>
        </div>
      </Field>

      <fieldset className="min-w-0 space-y-1.5">
        <legend className="flex items-center gap-1.5 text-xs font-semibold text-ink-2">
          <StoreIcon className="size-3.5 text-accent" aria-hidden />
          Магазины
        </legend>
        <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-[4px] border border-stroke p-1">
          {stores.length === 0 && (
            <p className="px-2 py-1 text-xs text-ink-3">Магазины загружаются…</p>
          )}
          {stores.map((store) => {
            const checked = filters.storeIDs.includes(store.storeID)
            return (
              <label
                key={store.storeID}
                className="flex cursor-pointer items-center gap-2 rounded-[4px] px-2 py-1 text-[13px] transition duration-100 ease-fluent hover:bg-fill-subtle"
              >
                <input
                  type="checkbox"
                  className="size-3.5 accent-accent"
                  checked={checked}
                  onChange={() =>
                    setFilters({
                      storeIDs: checked
                        ? filters.storeIDs.filter((id) => id !== store.storeID)
                        : [...filters.storeIDs, store.storeID],
                    })
                  }
                />
                <span className="truncate">{store.storeName}</span>
              </label>
            )
          })}
        </div>
        {filters.storeIDs.length > 1 && (
          <span className="block text-xs text-ink-3">
            Несколько магазинов фильтруются по загруженным страницам.
          </span>
        )}
      </fieldset>

      <Field
        label={
          currency === 'RUB'
            ? `Цена, ≈ ₽: ${formatNumber(displayLower)}–${formatNumber(displayUpper)}`
            : `Цена, $: ${filters.lowerPrice}–${filters.upperPrice}`
        }
        hint={
          currency === 'RUB'
            ? `В рублях ориентировочно; в API цены в долларах (0–${MAX_PRICE}$).`
            : `Диапазон 0–${MAX_PRICE}$`
        }
        icon={<Coins className="size-3.5 text-accent" aria-hidden />}
      >
        <PriceRange max={displayMax} value={[displayLower, displayUpper]} onCommit={commitRange} />
        <div className="mt-2 flex items-center gap-2">
          <NumberField
            key={`price-min-${resetToken}-${currency}`}
            ariaLabel="Цена от"
            value={displayLower}
            min={0}
            max={displayUpper}
            fallback={0}
            onCommit={(value) => commitRange([value, displayUpper])}
          />
          <span className="text-ink-3">—</span>
          <NumberField
            key={`price-max-${resetToken}-${currency}`}
            ariaLabel="Цена до"
            value={displayUpper}
            min={Math.max(1, displayLower)}
            max={displayMax}
            fallback={displayMax}
            onCommit={(value) => commitRange([displayLower, value])}
          />
        </div>
      </Field>

      <Field
        label={`Скидка не меньше ${filters.minSavings}%`}
        hint="Считается по загруженным страницам"
        icon={<Gauge className="size-3.5 text-accent" aria-hidden />}
      >
        <input
          type="range"
          min={0}
          max={95}
          step={5}
          value={filters.minSavings}
          onChange={(event) => setFilters({ minSavings: Number(event.target.value) })}
          className="w-full"
          style={
            {
              '--range-fill': `linear-gradient(to right, var(--accent) ${savingsPercent}%, var(--fill-active) ${savingsPercent}%)`,
            } as CSSProperties
          }
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Metacritic">
          <select
            className="input"
            value={filters.metacritic}
            onChange={(event) => setFilters({ metacritic: Number(event.target.value) })}
          >
            <option value={0}>Любой</option>
            <option value={60}>60+</option>
            <option value={75}>75+</option>
            <option value={85}>85+</option>
          </select>
        </Field>
        <Field label="Рейтинг Steam">
          <select
            className="input"
            value={filters.steamRating}
            onChange={(event) => setFilters({ steamRating: Number(event.target.value) })}
          >
            <option value={0}>Любой</option>
            <option value={70}>70%+</option>
            <option value={80}>80%+</option>
            <option value={90}>90%+</option>
          </select>
        </Field>
      </div>

      <Field
        label="Дата изменения цены"
        icon={<CalendarClock className="size-3.5 text-accent" aria-hidden />}
      >
        <select
          className="input"
          value={filters.maxAge}
          onChange={(event) => setFilters({ maxAge: Number(event.target.value) })}
        >
          <option value={0}>За всё время</option>
          <option value={7}>За неделю</option>
          <option value={30}>За месяц</option>
          <option value={90}>За 3 месяца</option>
          <option value={365}>За год</option>
        </select>
      </Field>

      <div className="space-y-1 border-t border-stroke pt-2">
        <Switch
          label="Только со скидкой"
          checked={filters.onSale}
          onChange={(value) => setFilters({ onSale: value })}
        />
        <Switch
          label="Только AAA-игры"
          checked={filters.aaa}
          onChange={(value) => setFilters({ aaa: value })}
        />
      </div>

      <TagPicker
        index={tagIndex}
        selected={filters.tags}
        matchAll={filters.matchAll}
        onToggle={toggleTag}
        onMatchAllChange={(value) => setFilters({ matchAll: value })}
        onClear={() => setFilters({ tags: [] })}
      />

      <PresetsSection filters={filters} applyPreset={applyPreset} onApply={bumpResetToken} />
    </div>
  )
}
