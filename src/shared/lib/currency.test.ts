import { afterEach, describe, expect, it } from 'vitest'
import { fromDisplayCurrency, getCurrency, setCurrency, setUsdRubRate } from './currency'
import { formatPrice } from './format'

afterEach(() => {
  setCurrency('USD')
})

describe('formatPrice', () => {
  it('в долларах показывает цену как есть', () => {
    expect(formatPrice(10)).toContain('10,00')
    expect(formatPrice(10)).toContain('$')
  })

  it('в рублях конвертирует и помечает значение как приблизительное', () => {
    setUsdRubRate(90)
    setCurrency('RUB')
    const text = formatPrice(10)
    expect(text).toContain('≈')
    expect(text).toContain('900')
    expect(text).toContain('₽')
  })

  it('запоминает выбранную валюту', () => {
    setCurrency('RUB')
    expect(getCurrency()).toBe('RUB')
    setCurrency('USD')
    expect(getCurrency()).toBe('USD')
  })

  it('переводит значение из рублей обратно в доллары', () => {
    setUsdRubRate(90)
    setCurrency('RUB')
    expect(fromDisplayCurrency(900)).toBeCloseTo(10)
    setCurrency('USD')
    expect(fromDisplayCurrency(10)).toBe(10)
  })
})
