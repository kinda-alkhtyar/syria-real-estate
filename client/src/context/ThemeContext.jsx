import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  ThemeContext,
  resolveTheme,
  storedThemes,
  themeModes,
  themeStorageKey,
} from './theme-context.js'

/* Dark is expressed as one thing only: this class on <html>. */
const darkClassName = 'dark'
const colorSchemeQuery = '(prefers-color-scheme: dark)'

function isThemeMode(value) {
  return themeModes.includes(value)
}

function readStoredTheme() {
  try {
    const storedTheme = window.localStorage.getItem(themeStorageKey)
    return storedThemes.includes(storedTheme) ? storedTheme : null
  } catch {
    // Storage can be unavailable in privacy-restricted environments.
    return null
  }
}

function writeStoredTheme(theme) {
  try {
    if (theme === 'system') {
      window.localStorage.removeItem(themeStorageKey)
      return
    }

    window.localStorage.setItem(themeStorageKey, theme)
  } catch {
    // The selected mode still works for this session when storage is blocked.
  }
}

function systemPrefersDark() {
  return window.matchMedia(colorSchemeQuery).matches
}

function getSystemTheme() {
  return systemPrefersDark() ? 'dark' : 'light'
}

function applyTheme(resolvedTheme) {
  document.documentElement.classList.toggle(
    darkClassName,
    resolvedTheme === 'dark',
  )
}

export function ThemeProvider({ children }) {
  // The pre-paint script already resolved this exact value; re-deriving it from
  // the same inputs keeps React in sync without a second source of truth.
  const [theme, setThemeState] = useState(() => readStoredTheme() ?? 'system')
  const [systemTheme, setSystemTheme] = useState(getSystemTheme)

  const resolvedTheme = resolveTheme(theme, systemTheme === 'dark')

  const setTheme = useCallback((nextTheme) => {
    if (!isThemeMode(nextTheme)) {
      return
    }

    writeStoredTheme(nextTheme)

    if (nextTheme === 'system') {
      setSystemTheme(getSystemTheme())
    }

    setThemeState(nextTheme)
  }, [])

  useEffect(() => {
    applyTheme(resolvedTheme)
  }, [resolvedTheme])

  useEffect(() => {
    // The system preference is followed only while no choice is stored, so a
    // manual pick can never be overridden by the device switching appearance.
    if (theme !== 'system') {
      return undefined
    }

    const mediaQuery = window.matchMedia(colorSchemeQuery)

    function handleSystemThemeChange() {
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light')
    }

    handleSystemThemeChange()
    mediaQuery.addEventListener('change', handleSystemThemeChange)
    return () =>
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
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
