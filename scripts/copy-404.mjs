import { copyFile, writeFile } from 'node:fs/promises'

const dist = new URL('../dist/', import.meta.url)

// GitHub Pages не умеет SPA-fallback, поэтому отдаём index.html и на 404.
await copyFile(new URL('index.html', dist), new URL('404.html', dist))
// Чтобы Pages не обрабатывал файлы через Jekyll.
await writeFile(new URL('.nojekyll', dist), '')

console.log('✓ dist/404.html и dist/.nojekyll созданы')
