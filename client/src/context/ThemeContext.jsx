import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  ThemeContext,
  themeModes,
  themeStorageKey,
} from './theme-context.js'

function isThemeMode(value) {
  return themeModes.includes(value)
}

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function getInitialTheme() {
  const initializedTheme = document.documentElement.dataset.themeMode
  return isThemeMode(initializedTheme) ? initializedTheme : 'system'
}

function applyTheme(theme) {
  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme
  const root = document.documentElement

  root.dataset.theme = resolvedTheme
  root.dataset.themeMode = theme

  return resolvedTheme
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme)
  const [systemTheme, setSystemTheme] = useState(
    () => document.documentElement.dataset.theme ?? getSystemTheme(),
  )
  const resolvedTheme = theme === 'system' ? systemTheme : theme

  const setTheme = useCallback((nextTheme) => {
    if (!isThemeMode(nextTheme)) {
      return
    }

    if (nextTheme === 'system') {
      setSystemTheme(getSystemTheme())
    }

    applyTheme(nextTheme)
    setThemeState(nextTheme)
  }, [])

  useEffect(() => {
    applyTheme(theme)

    try {
      window.localStorage.setItem(themeStorageKey, theme)
    } catch {
      // The selected mode still works for this session when storage is blocked.
    }

    if (theme !== 'system') {
      return undefined
    }

    const colorSchemeQuery = window.matchMedia(
      '(prefers-color-scheme: dark)',
    )

    function handleSystemThemeChange() {
      const nextSystemTheme = getSystemTheme()
      setSystemTheme(nextSystemTheme)
      applyTheme('system')
    }

    colorSchemeQuery.addEventListener('change', handleSystemThemeChange)
    return () =>
      colorSchemeQuery.removeEventListener('change', handleSystemThemeChange)
  }, [theme])

  const value = useMemo(
    () => ({
      resolvedTheme,
      setTheme,
      theme,
      themes: themeModes,
    }),
    [resolvedTheme, setTheme, theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
