import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router'
import { BarChart3, Flame, Heart, Info } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Logo } from '@/shared/ui/Logo'
import { RateLimitBanner } from '@/shared/ui/RateLimitBanner'
import { ThemeToggle } from '@/shared/ui/ThemeToggle'
import { Backdrop } from './Backdrop'

const NAV = [
  { to: '/', label: 'Скидки', icon: Flame, end: true },
  { to: '/favorites', label: 'Избранное', icon: Heart, end: false },
  { to: '/analytics', label: 'Аналитика', icon: BarChart3, end: false },
  { to: '/about', label: 'О проекте', icon: Info, end: false },
] as const

export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollRestoration />
      <Backdrop />

      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-[4px] focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-fg"
      >
        К основному содержимому
      </a>

      <header className="acrylic sticky top-0 z-30 border-b border-stroke">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-2">
          <Link to="/" viewTransition aria-label="GameDeals — на главную" className="shrink-0">
            <Logo />
          </Link>

          <nav
            aria-label="Основная навигация"
            className="ml-auto hidden items-center gap-1 sm:flex"
          >
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                viewTransition
                className={({ isActive }) =>
                  cn(
                    'relative rounded-[4px] px-3 py-2 text-[13px] font-semibold transition duration-100 ease-fluent',
                    isActive
                      ? 'text-ink after:absolute after:inset-x-2 after:bottom-0.5 after:h-[3px] after:rounded-full after:bg-accent'
                      : 'text-ink-2 hover:bg-fill-subtle hover:text-ink',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto sm:ml-0">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-28 sm:pb-10">
        <RateLimitBanner />
        <Outlet />
      </main>

      <footer className="mx-auto w-full max-w-7xl px-4 pb-28 sm:pb-8">
        <div className="card flex flex-col gap-2 p-4 text-xs text-ink-2 sm:flex-row sm:items-center sm:justify-between">
          <p>Учебный проект: Задание 1, «Кроссплатформенная разработка» — Дьяченко Антон.</p>
          <p>
            Данные —{' '}
            <a
              className="link"
              href="https://apidocs.cheapshark.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              CheapShark API
            </a>
            .
          </p>
        </div>
      </footer>

      <nav
        aria-label="Мобильная навигация"
        className="fixed inset-x-3 bottom-3 z-30 pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        <ul className="acrylic flex gap-1 rounded-lg border border-stroke p-1 shadow-e16">
          {NAV.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.end}
                viewTransition
                className={({ isActive }) =>
                  cn(
                    'relative flex flex-col items-center gap-0.5 rounded-[4px] py-2 text-[10px] font-semibold transition duration-100 ease-fluent',
                    isActive ? 'text-accent' : 'text-ink-2 hover:bg-fill-subtle',
                  )
                }
              >
                <item.icon className="size-5" aria-hidden />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
