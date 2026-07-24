import { Languages } from 'lucide-react'

import { useLocale } from '../../hooks/useLocale.js'

export default function LanguageSelector({ compact = false }) {
  const { locale, locales, setLocale, t } = useLocale()

  return (
    <label className="relative inline-flex min-h-11 items-center rounded-xl border border-line bg-surface text-ink">
      <span className="sr-only">{t('accessibility.chooseLanguage')}</span>
      <Languages aria-hidden="true" className="ms-3 shrink-0" size={17} />
      <select
        aria-label={t('accessibility.chooseLanguage')}
        className={`min-h-11 appearance-none rounded-xl bg-transparent py-2 ps-2 pe-8 text-sm font-semibold outline-none ${
          compact ? 'max-w-28' : 'min-w-32'
        }`}
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
