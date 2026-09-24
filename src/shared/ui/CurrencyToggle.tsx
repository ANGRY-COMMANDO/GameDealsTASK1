import { getUsdRubRate, setCurrency, useCurrency, type Currency } from '@/shared/lib/currency'
import { cn } from '@/shared/lib/utils'

const OPTIONS: Array<{ value: Currency; label: string; name: string }> = [
  {
    value: 'USD',
    label: '$',
    name: 'Доллары',
  },
  {
    value: 'RUB',
    label: '₽',
    name: 'Рубли',
  },
]

/** Переключатель валюты отображения цен. */
export function CurrencyToggle() {
  const currency = useCurrency()
  const rate = getUsdRubRate()

  const titleFor = (option: Currency) =>
    option === 'RUB'
      ? `Рубли: ориентировочно по курсу ${rate.toFixed(1)} ₽ за $1. Не учитывает региональные цены и налоги.`
      : 'Доллары США — цены как в CheapShark'

  return (
    <fieldset
      className="inline-flex overflow-hidden rounded-[4px] border border-stroke-strong bg-surface p-0.5"
      aria-label="Валюта цен"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cn(
            'grid h-6 min-w-6 place-items-center rounded-[3px] px-1 text-xs font-semibold transition duration-100 ease-fluent',
            currency === option.value
              ? 'bg-accent text-accent-fg'
              : 'text-ink-2 hover:bg-fill-subtle hover:text-ink',
          )}
          aria-pressed={currency === option.value}
          aria-label={option.name}
          title={titleFor(option.value)}
          onClick={() => setCurrency(option.value)}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  )
}
