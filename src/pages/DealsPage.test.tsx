import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { resetApiGateForTests } from '@/shared/api/client'
import { makeDeal, makeTagIndex } from '@/test/factories'
import DealsPage from './DealsPage'

const store = {
  storeID: '1',
  storeName: 'Steam',
  images: { icon: '/img/stores/icons/0.png' },
}

let calls: string[] = []

const isDealsWithTitle = (url: string) =>
  url.includes('/api/1.0/deals') && url.includes('title=doom')

function jsonResponse(body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

function setupFetchMock() {
  calls = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      calls.push(url)
      if (url.includes('/api/1.0/stores')) return jsonResponse([store])
      if (url.includes('/data/tags.json')) return jsonResponse(makeTagIndex())
      if (url.includes('/api/1.0/games')) return jsonResponse([])
      if (url.includes('/api/1.0/deals')) {
        return jsonResponse(
          [
            makeDeal({
              dealID: 'a',
              title: 'The Witcher 3',
              steamAppID: '292030',
              savings: 80,
              salePrice: 7.99,
            }),
            makeDeal({
              dealID: 'b',
              title: 'Dota 2',
              steamAppID: '570',
              savings: 20,
              salePrice: 0.99,
            }),
          ],
          { 'X-Total-Page-Count': '1' },
        )
      }
      throw new Error(`Неожиданный запрос: ${url}`)
    }),
  )
}

function renderPage() {
  const router = createMemoryRouter([{ path: '/', element: <DealsPage /> }], {
    initialEntries: ['/'],
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('DealsPage', () => {
  beforeEach(() => {
    setupFetchMock()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    // Сбрасываем семафор API: запросы, оставшиеся в очереди, не должны «выстрелить»
    // в следующем тесте уже без мока fetch.
    resetApiGateForTests()
  })

  it('показывает карточки с ценой, магазином и ссылкой на покупку', async () => {
    renderPage()

    expect(await screen.findByText('The Witcher 3')).toBeInTheDocument()
    expect(screen.getByText('Dota 2')).toBeInTheDocument()
    expect(screen.getByText(/7,99/)).toBeInTheDocument()
    expect(screen.getAllByTestId('discount-badge')[0]).toHaveTextContent('80%')

    const links = screen.getAllByRole('link', { name: /В магазин/i })
    expect(links[0]).toHaveAttribute('href', 'https://store.steampowered.com/app/292030/')
    expect(links[0]).toHaveAttribute('target', '_blank')
  })

  it('фильтрует результаты по тегу из индекса', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText('Dota 2')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'RPG' }))

    await waitFor(() => {
      expect(screen.queryByText('Dota 2')).not.toBeInTheDocument()
    })
    expect(screen.getByText('The Witcher 3')).toBeInTheDocument()
  })

  it('подставляет поисковый запрос в параметры API', async () => {
    const user = userEvent.setup()
    renderPage()

    const input = await screen.findByRole('combobox', { name: /Поиск игр/i })
    await user.type(input, 'doom')

    await waitFor(
      () => {
        expect(calls.some((url) => url.includes('title=doom'))).toBe(true)
      },
      { timeout: 3000 },
    )
  })

  it('очистка поиска не возвращает устаревший запрос', async () => {
    const user = userEvent.setup()
    renderPage()

    const input = await screen.findByRole('combobox', { name: /Поиск игр/i })
    await user.type(input, 'doom')
    await waitFor(
      () => {
        expect(calls.some(isDealsWithTitle)).toBe(true)
      },
      { timeout: 3000 },
    )

    const before = calls.length
    await user.click(screen.getByRole('button', { name: 'Очистить поиск' }))
    await waitFor(() => {
      expect(calls.slice(before).some((url) => !url.includes('title='))).toBe(true)
    })

    // Debounce поиска не должен «догнать» и вернуть снятый запрос.
    await new Promise((resolve) => setTimeout(resolve, 700))
    expect(calls.slice(before).some(isDealsWithTitle)).toBe(false)
  })
})
