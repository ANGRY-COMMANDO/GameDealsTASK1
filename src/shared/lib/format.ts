import { getCurrency, toDisplayCurrency } from './currency'

const usd = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

const usdCompact = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const rub = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
})

const rubCompact = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const plainNumber = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })

/** Число без символа валюты — для диапазонов и подписей. */
export function formatNumber(value: number) {
  if (!Number.isFinite(value)) return '—'
  return plainNumber.format(value)
}

const dateTime = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const relative = new Intl.RelativeTimeFormat('ru-RU', { numeric: 'auto' })

/** CheapShark отдаёт даты в секундах, JS ждёт миллисекунды. */
function toMs(timestamp: number) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return 0
  return timestamp < 1e12 ? timestamp * 1000 : timestamp
}

const pluralRules = new Intl.PluralRules('ru-RU')

/** Русская плюрализация: plural(1, 'товар', 'товара', 'товаров'). */
export function plural(count: number, one: string, few: string, many: string) {
  const rule = pluralRules.select(count)
  if (rule === 'one') return one
  if (rule === 'few') return few
  return many
}

export function formatPrice(value: number, options: { compact?: boolean } = {}) {
  if (!Number.isFinite(value)) return '—'
  if (getCurrency() === 'RUB') {
    const converted = toDisplayCurrency(value)
    return `≈ ${options.compact ? rubCompact.format(converted) : rub.format(converted)}`
  }
  return options.compact ? usdCompact.format(value) : usd.format(value)
}

export function formatPercent(value: number, fractionDigits = 0) {
  if (!Number.isFinite(value)) return '—'
  return `${value.toFixed(fractionDigits)}%`
}

export function formatDate(timestamp: number) {
  const ms = toMs(timestamp)
  if (!ms) return '—'
  return dateTime.format(new Date(ms))
}

export function formatYear(timestamp: number) {
  const ms = toMs(timestamp)
  if (!ms) return '—'
  return String(new Date(ms).getFullYear())
}

export function formatRelativeDate(timestamp: number) {
  const ms = toMs(timestamp)
  if (!ms) return '—'
  const diffMs = ms - Date.now()
  const diffDays = Math.round(diffMs / 86_400_000)
  if (Math.abs(diffDays) < 30) return relative.format(diffDays, 'day')
  const diffMonths = Math.round(diffDays / 30)
  if (Math.abs(diffMonths) < 12) return relative.format(diffMonths, 'month')
  return relative.format(Math.round(diffMonths / 12), 'year')
}

/** Класс цвета для оценки Metacritic (0 = нет оценки). */
export function metacriticTone(score: number) {
  if (!score) return 'text-slate-400'
  if (score >= 85) return 'text-emerald-600 dark:text-emerald-400'
  if (score >= 70) return 'text-lime-600 dark:text-lime-400'
  if (score >= 50) return 'text-amber-600 dark:text-amber-400'
  return 'text-rose-600 dark:text-rose-400'
}
