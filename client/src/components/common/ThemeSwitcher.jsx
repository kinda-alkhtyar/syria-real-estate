import { ChevronDown, Monitor, Moon, Sun } from 'lucide-react'

import { useLocale } from '../../hooks/useLocale.js'
import { useTheme } from '../../hooks/useTheme.js'

const themeIcons = {
  dark: Moon,
  light: Sun,
  system: Monitor,
}

export default function ThemeSwitcher({ className = '' }) {
  const { setTheme, theme, themes } = useTheme()
  const { t } = useLocale()
  const ThemeIcon = themeIcons[theme]
  const activeLabel = t(`theme.${theme}`)

  return (
    <label
      className={`relative inline-flex h-11 w-27 shrink-0 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-ink transition duration-fast ease-standard hover:border-input-line hover:bg-hover focus-within:border-focus focus-within:ring-3 focus-within:ring-focus/25 motion-reduce:transition-none ${className}`}
      title={activeLabel}
    >
      <span className="sr-only">{t('accessibility.changeTheme')}</span>
      <ThemeIcon aria-hidden="true" className="shrink-0 text-muted" size={16} />
      <span
        aria-hidden="true"
        className="min-w-0 flex-1 truncate text-xs font-semibold"
      >
        {activeLabel}
      </span>
      <ChevronDown aria-hidden="true" className="shrink-0 text-muted" size={14} />
      <select
        aria-label={t('accessibility.changeTheme')}
        className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
        onChange={(event) => setTheme(event.target.value)}
        value={theme}
      >
        {themes.map((themeOption) => (
          <option key={themeOption} value={themeOption}>
            {t(`theme.${themeOption}`)}
          </option>
        ))}
      </select>
    </label>
  )
}
