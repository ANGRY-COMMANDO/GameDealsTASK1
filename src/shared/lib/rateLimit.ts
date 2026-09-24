import { useSyncExternalStore } from 'react'
import { readStorage, writeStorage } from './storage'
import { createExternalStore } from './store'

const STORAGE_KEY = 'gd-rate-limit-until'

/**
 * Время, до которого CheapShark ограничил запросы. Используется, чтобы не ждать
 * паузу вхолостую, показать предупреждение и не долбить API лишний раз.
 * Карантин переживает перезагрузку страницы: в localStorage лежит timestamp.
 */
let until = 0
/** Кэш «минут осталось»: из него читает рендер, чтобы не звать Date.now() во время отрисовки. */
let minutesLeft: number | null = null
const store = createExternalStore()
let tickTimer: ReturnType<typeof setInterval> | undefined
let expiryTimer: ReturnType<typeof setTimeout> | undefined

function readStoredUntil() {
  const value = Number(readStorage(STORAGE_KEY))
  return Number.isFinite(value) ? value : 0
}

function writeStoredUntil(value: number) {
  writeStorage(STORAGE_KEY, value > 0 ? String(value) : null)
}

function stopTimers() {
  if (tickTimer) clearInterval(tickTimer)
  if (expiryTimer) clearTimeout(expiryTimer)
  tickTimer = undefined
  expiryTimer = undefined
}

function refresh() {
  const remaining = until - Date.now()
  if (remaining > 0) {
    minutesLeft = Math.max(1, Math.ceil(remaining / 60_000))
  } else {
    until = 0
    minutesLeft = null
    writeStoredUntil(0)
    stopTimers()
  }
  store.emit()
}

function scheduleTimers() {
  tickTimer = setInterval(refresh, 30_000)
  expiryTimer = setTimeout(refresh, Math.max(0, until - Date.now()))
}

export function setRateLimitUntil(next: number) {
  if (next <= until) return
  until = next
  writeStoredUntil(next)
  stopTimers()
  refresh()
  scheduleTimers()
}

export function clearRateLimit() {
  if (until === 0 && minutesLeft === null) return
  until = 0
  minutesLeft = null
  writeStoredUntil(0)
  stopTimers()
  store.emit()
}

export function isRateLimited() {
  return minutesLeft !== null
}

export function getRateLimitUntil() {
  return until
}

function getMinutes() {
  return minutesLeft
}

/** Сколько минут осталось до конца ограничения, или null, если ограничения нет. */
export function useRateLimitMinutes() {
  return useSyncExternalStore(store.subscribe, getMinutes, () => null)
}

/** Реактивная проверка карантина: перерисовывает кнопки, когда он заканчивается. */
export function useIsRateLimited() {
  return useSyncExternalStore(store.subscribe, isRateLimited, () => false)
}

const storedUntil = readStoredUntil()
if (storedUntil > Date.now()) {
  until = storedUntil
  refresh()
  scheduleTimers()
} else if (storedUntil > 0) {
  writeStoredUntil(0)
}
