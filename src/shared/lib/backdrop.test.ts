import { afterEach, describe, expect, it } from 'vitest'
import { clearBackdropImages, setBackdropImages, useBackdropImages } from './backdrop'
import { renderHook } from '@testing-library/react'

afterEach(() => {
  clearBackdropImages()
})

describe('хранилище фоновых артов', () => {
  it('дедуплицирует ссылки и игнорирует пустые', () => {
    setBackdropImages(['a', 'a', '', null, undefined, 'b'])
    const { result } = renderHook(() => useBackdropImages())
    expect(result.current).toEqual(['a', 'b'])
  })

  it('ограничивает набор восемью артами', () => {
    setBackdropImages(Array.from({ length: 12 }, (_, index) => `img-${index}`))
    const { result } = renderHook(() => useBackdropImages())
    expect(result.current).toHaveLength(8)
  })

  it('сохраняет ссылку на массив, если ничего не изменилось', () => {
    setBackdropImages(['a', 'b'])
    const { result, rerender } = renderHook(() => useBackdropImages())
    const first = result.current
    setBackdropImages(['a', 'b'])
    rerender()
    expect(result.current).toBe(first)
  })
})
