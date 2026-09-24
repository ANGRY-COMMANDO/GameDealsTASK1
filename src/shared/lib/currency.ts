import { useSyncExternalStore } from 'react'
import { readStorage, writeStorage } from './storage'
import { createExternalStore } from './store'

export type Currency = 'USD' | 'RUB'

const CURRENCY_KEY = 'gd-currency'
const RATE_KEY = 'gd-usd-rub'
const RATE_URL = 'https://open.er-api.com/v6/latest/USD'

/** Запасной курс, если сеть недоступна. В интерфейсе он всегда помечен знаком «≈». */
const USD_RUB_FALLBACK = 85

let currency: Currency = readStorage(CURRENCY_KEY) === 'RUB' ? 'RUB' : 'USD'

let usdRubRate = Number(readStorage(RATE_KEY))
if (!Number.isFinite(usdRubRate) || usdRubRate <= 0) usdRubRate = USD_RUB_FALLBACK

const store = createExternalStore()

export function getCurrency(): Currency {
  return currency
}

export function setCurrency(next: Currency) {
  if (next === currency) return
  currency = next
  writeStorage(CURRENCY_KEY, next)
  store.emit()
}

export function useCurrency(): Currency {
  return useSyncExternalStore(store.subscribe, getCurrency, getCurrency)
}

export function getUsdRubRate() {
  return usdRubRate
}

export function setUsdRubRate(rate: number) {
  if (!Number.isFinite(rate) || rate <= 0 || rate === usdRubRate) return
  usdRubRate = rate
  writeStorage(RATE_KEY, String(rate))
  store.emit()
}

/** Переводит цену из долларов (как в API) в выбранную валюту отображения. */
export function toDisplayCurrency(valueUsd: number) {
  return currency === 'RUB' ? valueUsd * usdRubRate : valueUsd
}

/** Обратный перевод: значение из валюты отображения назад в доллары для API. */
export function fromDisplayCurrency(value: number) {
  return currency === 'RUB' ? value / usdRubRate : value
}

/** Разово обновляет курс при старте приложения; при сбое остаётся сохранённый. */
export async function refreshUsdRubRate() {
  try {
    const response = await fetch(RATE_URL, { signal: AbortSignal.timeout(8000) })
    if (!response.ok) return
    const json: unknown = await response.json()
    const rate = (json as { rates?: Record<string, unknown> }).rates?.RUB
    if (typeof rate === 'number') setUsdRubRate(rate)
  } catch {
    /* офлайн или сервис недоступен — используем сохранённый курс */
  }
}
