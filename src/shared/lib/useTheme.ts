import { useCallback, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'gd-theme'

const THEME_COLOR: Record<Theme, string> = {
  light: '#f5f6fb',
  dark: '#070b1a',
}

function currentTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.setAttribute('content', THEME_COLOR[theme])
  }
}

/**
 * Тема: по умолчанию следует системной и реагирует на её смену «на лету».
 * Явный выбор пользователя перебивает системный и сохраняется в localStorage.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    typeof document === 'undefined' ? 'light' : currentTheme(),
  )
  const [followsSystem, setFollowsSystem] = useState(() => readStoredTheme() === null)

  useEffect(() => {
    applyTheme(theme)
    try {
      if (followsSystem) localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* приватный режим — игнорируем */
    }
  }, [theme, followsSystem])

  useEffect(() => {
    if (!followsSystem) return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event: MediaQueryListEvent) => setTheme(event.matches ? 'dark' : 'light')
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [followsSystem])

  const toggle = useCallback(() => {
    setFollowsSystem(false)
    setTheme((value) => (value === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggle }
}
