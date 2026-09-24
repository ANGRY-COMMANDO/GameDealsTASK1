import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'

// На GitHub Pages приложение живёт в подпапке /<repo>/. Локально — в корне.
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base = repo ? `/${repo}/` : '/'

// VITE_ANALYZE=1 pnpm run analyze — карта бандла в dist/stats.html.
const analyze = process.env.VITE_ANALYZE === '1'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    ...(analyze
      ? [visualizer({ filename: 'dist/stats.html', gzipSize: true, brotliSize: true })]
      : []),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Транспилируем только под актуальный baseline, а не под старые браузеры.
    target: 'baseline-widely-available',
    cssTarget: 'chrome120',
    rolldownOptions: {
      output: {
        // Разделяем вендоров по частоте изменений: обновление кода приложения
        // не сбрасывает кэш тяжёлых библиотек.
        codeSplitting: {
          groups: [
            {
              name: 'charts',
              test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2)[\\/]/,
              priority: 30,
            },
            {
              name: 'query',
              test: /[\\/]node_modules[\\/]@tanstack[\\/]/,
              priority: 20,
            },
            {
              name: 'router',
              test: /[\\/]node_modules[\\/](react-router|@remix-run)[\\/]/,
              priority: 15,
            },
            {
              name: 'react',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 10,
            },
            {
              name: 'vendor',
              test: /[\\/]node_modules[\\/]/,
              priority: 0,
            },
          ],
        },
      },
    },
  },
})
