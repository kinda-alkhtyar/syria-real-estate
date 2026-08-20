import { createContext } from 'react'

export const ThemeContext = createContext(null)

/** Modes a control may pick. `system` means "no stored choice of my own". */
export const themeModes = ['light', 'dark', 'system']

/** The only values ever written to storage — `system` is stored as absence. */
export const storedThemes = ['light', 'dark']

export const themeStorageKey = 'dar-syria-theme'

/**
 * The single theme resolution rule, shared by the pre-paint script in
 * index.html and by the provider: a stored choice wins, and only without one
 * does the system preference decide.
 *
 * @param {unknown} storedTheme Raw storage value, possibly absent or stale.
 * @param {boolean} systemPrefersDark `prefers-color-scheme: dark` match.
 * @returns {'light' | 'dark'} The appearance to paint.
 */
export function resolveTheme(storedTheme, systemPrefersDark) {
  if (storedThemes.includes(storedTheme)) {
    return storedTheme
  }

  return systemPrefersDark ? 'dark' : 'light'
}
