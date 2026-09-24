import { readFileSync } from 'node:fs'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LogoMark } from './Logo'

describe('LogoMark', () => {
  it('повторяет геометрию мастер-SVG public/logo.svg', () => {
    // Геометрия знака дублируется в TSX ради прозрачного фона, поэтому следим,
    // чтобы правки мастер-SVG не забывались в компоненте.
    const master = readFileSync('public/logo.svg', 'utf8')
    const masterPath = /id="padBody"\s+d="([^"]+)"/.exec(master)?.[1]
    expect(masterPath).toBeTruthy()

    const { container } = render(<LogoMark />)
    expect(container.querySelector('path')?.getAttribute('d')).toBe(masterPath)
  })
})
