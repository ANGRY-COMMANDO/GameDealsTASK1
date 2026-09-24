import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearRateLimit, isRateLimited, setRateLimitUntil } from './rateLimit'

afterEach(() => {
  clearRateLimit()
})

describe('карантин лимита API', () => {
  it('запоминает ограничение в localStorage', () => {
    setRateLimitUntil(Date.now() + 60_000)
    expect(isRateLimited()).toBe(true)
    expect(Number(localStorage.getItem('gd-rate-limit-until'))).toBeGreaterThan(Date.now())
  })

  it('сбрасывается вручную', () => {
    setRateLimitUntil(Date.now() + 60_000)
    clearRateLimit()
    expect(isRateLimited()).toBe(false)
    expect(localStorage.getItem('gd-rate-limit-until')).toBeNull()
  })

  it('игнорирует уже истёкшее ограничение', () => {
    setRateLimitUntil(Date.now() - 1000)
    expect(isRateLimited()).toBe(false)
  })

  it('восстанавливается из localStorage при загрузке модуля', async () => {
    localStorage.setItem('gd-rate-limit-until', String(Date.now() + 60_000))
    vi.resetModules()
    const fresh = await import('./rateLimit')
    expect(fresh.isRateLimited()).toBe(true)
    fresh.clearRateLimit()
  })
})
