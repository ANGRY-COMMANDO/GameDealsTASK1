import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom не умеет ResizeObserver и matchMedia, а на них завязана виртуализация ленты.
class ResizeObserverStub implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverStub

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

// jsdom ругается «Not implemented», а виртуализатор окна дергает scrollTo при монтировании.
window.scrollTo = () => {}

// Автоочистка DOM между тестами (vitest запускается без globals).
afterEach(() => cleanup())
