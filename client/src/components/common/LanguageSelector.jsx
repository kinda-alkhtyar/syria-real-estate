import { Languages } from 'lucide-react'

import { useLocale } from '../../hooks/useLocale.js'

export default function LanguageSelector({ compact = false }) {
  const { locale, locales, setLocale } = useLocale()

  return (
    <label className="relative inline-flex min-h-11 items-center rounded-full border border-line bg-white text-ink">
      <span className="sr-only">Choose language</span>
      <Languages aria-hidden="true" className="ms-3 shrink-0" size={17} />
      <select
        aria-label="Choose language"
        className={`min-h-11 appearance-none rounded-full bg-transparent py-2 ps-2 pe-8 text-sm font-semibold outline-none ${
          compact ? 'max-w-28' : 'min-w-32'
        }`}
        onChange={(event) => setLocale(event.target.value)}
        value={locale.code}
      >
        {locales.map((localeOption) => (
          <option key={localeOption.code} value={localeOption.code}>
            {localeOption.label}
          </option>
        ))}
      </select>
    </label>
  )
}
