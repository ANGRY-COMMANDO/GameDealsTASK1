import { readFile, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

/**
 * Иконки сайта (og:image и apple-touch-icon) рендерятся напрямую из мастер-SVG
 * (public/logo.svg) через Chromium из Playwright — единый источник правды, без
 * ручной растеризации.
 */

const OUT_DIR = new URL('../public/', import.meta.url)

const files = [
  ['og-image.png', 512],
  ['apple-touch-icon-180x180.png', 180],
]

const svg = await readFile(new URL('../public/logo.svg', import.meta.url), 'utf8')

const browser = await chromium.launch()
const page = await browser.newPage()

for (const [name, size] of files) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(
    `<!doctype html><html><body style="margin:0;background:transparent">
      <div style="width:${size}px;height:${size}px">${svg.replace(
        '<svg ',
        `<svg width="${size}" height="${size}" `,
      )}</div>
    </body></html>`,
  )

  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  )

  const buffer = await page.screenshot({
    omitBackground: true,
    clip: { x: 0, y: 0, width: size, height: size },
  })
  await writeFile(new URL(name, OUT_DIR), buffer)
  console.log(`✓ public/${name}`)
}

await browser.close()
