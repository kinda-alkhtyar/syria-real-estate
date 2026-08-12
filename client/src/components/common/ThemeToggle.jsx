import { Moon, Sun } from 'lucide-react'

import { useLocale } from '../../hooks/useLocale.js'
import { useTheme } from '../../hooks/useTheme.js'
import IconButton from '../ui/IconButton.jsx'

/**
 * Round header control that flips between the light and dark appearance.
 * It reads and writes the shared `ThemeContext`, so every other theme control
 * (dashboard switcher, drawer) stays in sync without extra state.
 *
 * @param {object} props
 * @param {string} [props.className] Extra root classes for placement only.
 */
export default function ThemeToggle({ className = '' }) {
  const { resolvedTheme, setTheme } = useTheme()
  const { t } = useLocale()
  const isDark = resolvedTheme === 'dark'
  const label = isDark ? t('theme.toggleToLight') : t('theme.toggleToDark')

  return (
    <IconButton
      className={`rounded-full! duration-150! ${className}`}
      label={label}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={label}
    >
      {isDark ? (
        <Sun aria-hidden="true" size={20} />
      ) : (
        <Moon aria-hidden="true" size={20} />
      )}
    </IconButton>
  )
}
