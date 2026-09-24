import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router'
import { analyticsDealsQueryOptions, gameQueryOptions } from '@/shared/api/hooks'
import { DealsGridSkeleton, Skeleton } from '@/shared/ui/primitives'
import { AppLayout } from './AppLayout'
import { RouteError } from './RouteError'
import { queryClient } from './queryClient'

const DealsPage = lazy(() => import('@/pages/DealsPage'))
const FavoritesPage = lazy(() => import('@/pages/FavoritesPage'))
const GamePage = lazy(() => import('@/pages/GamePage'))
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'))
const AboutPage = lazy(() => import('@/pages/AboutPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

function PageFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

/** Ленивый маршрут с общим скелетоном страницы. */
function page(element: ReactNode, fallback: ReactNode = <PageFallback />) {
  return <Suspense fallback={fallback}>{element}</Suspense>
}

/** Скелетон на время стартовой загрузки данных (до первого рендера layout). */
function HydrateFallback() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <PageFallback />
    </div>
  )
}

const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteError />,
    HydrateFallback,
    children: [
      {
        index: true,
        element: page(<DealsPage />, <DealsGridSkeleton />),
      },
      {
        path: 'favorites',
        element: page(<FavoritesPage />),
      },
      {
        path: 'game/:gameID',
        // Прогреваем карточку игры до рендера. При ошибке не роняем layout —
        // страница сама покажет сообщение (в том числе про лимит API).
        loader: async ({ params }) => {
          try {
            await queryClient.ensureQueryData(gameQueryOptions(params.gameID ?? ''))
          } catch {
            /* ошибку отрисует GamePage */
          }
          return null
        },
        element: page(<GamePage />),
      },
      {
        path: 'analytics',
        // Аналитика грузит несколько страниц сразу — прячем водопад за навигацией.
        // При ошибке страница покажет своё состояние, не подменяя весь layout.
        loader: async ({ request }) => {
          const pages = Number(new URL(request.url).searchParams.get('pages'))
          try {
            await queryClient.ensureQueryData(analyticsDealsQueryOptions(pages))
          } catch {
            /* ошибку отрисует AnalyticsPage */
          }
          return null
        },
        element: page(<AnalyticsPage />),
      },
      {
        path: 'about',
        element: page(<AboutPage />),
      },
      {
        path: '*',
        element: page(<NotFoundPage />),
      },
    ],
  },
]

export const router = createBrowserRouter(routes, {
  basename: import.meta.env.BASE_URL.replace(/\/$/, '') || undefined,
})
