import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/shared/lib/useTheme'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      className="relative grid size-8 place-items-center rounded-[4px] text-ink-2 transition duration-100 ease-fluent hover:bg-fill-subtle hover:text-ink active:bg-fill-active"
      aria-pressed={isDark}
      title={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
    >
      <Sun
        className="size-4 transition duration-200 ease-fluent dark:-rotate-90 dark:scale-0"
        aria-hidden
      />
      <Moon
        className="absolute size-4 rotate-90 scale-0 transition duration-200 ease-fluent dark:rotate-0 dark:scale-100"
        aria-hidden
      />
      <span className="sr-only">Переключить тему</span>
    </button>
  )
}
