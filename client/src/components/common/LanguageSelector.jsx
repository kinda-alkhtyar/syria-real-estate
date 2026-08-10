import { ChevronDown } from 'lucide-react'

import { useLocale } from '../../hooks/useLocale.js'

export default function LanguageSelector({ className = '' }) {
  const { locale, locales, setLocale, t } = useLocale()

  return (
    <label
      className={`relative inline-flex h-11 w-20 shrink-0 items-center justify-center gap-1 rounded-lg border border-line bg-transparent px-2.5 text-ink transition duration-fast ease-standard hover:border-input-line hover:bg-hover focus-within:border-focus focus-within:ring-3 focus-within:ring-focus/25 motion-reduce:transition-none ${className}`}
    >
      <span className="sr-only">{t('accessibility.chooseLanguage')}</span>
      <span aria-hidden="true" className="min-w-0 truncate text-xs font-bold">
        {t(`languages.${locale.code}`)}
      </span>
      <ChevronDown aria-hidden="true" className="shrink-0 text-muted" size={14} />
      <select
        aria-label={t('accessibility.chooseLanguage')}
        className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
        onChange={(event) => setLocale(event.target.value)}
        value={locale.code}
      >
        {locales.map((localeOption) => (
          <option key={localeOption.code} value={localeOption.code}>
            {t(`languages.${localeOption.code}`)}
          </option>
        ))}
      </select>
    </label>
  )
}
