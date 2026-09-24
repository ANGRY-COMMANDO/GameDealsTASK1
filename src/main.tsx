import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router/dom'
import { refreshUsdRubRate } from '@/shared/lib/currency'
import { Devtools } from './app/Devtools'
import { queryClient } from './app/queryClient'
import { router } from './app/router'
import './index.css'

// Курс для рублёвого режима подтягиваем в фоне: без сети останется сохранённый.
void refreshUsdRubRate()

const container = document.getElementById('root')
if (!container) throw new Error('Не найден корневой элемент #root')

// Статический скелетон из index.html заменяем интерфейсом React.
container.replaceChildren()

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Devtools />
    </QueryClientProvider>
  </StrictMode>,
)
