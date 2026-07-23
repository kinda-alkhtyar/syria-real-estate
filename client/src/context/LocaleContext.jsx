import { useEffect, useMemo, useState } from 'react'

import { defaultLocale, locales } from '../constants/locales.js'
import { LocaleContext } from './locale-context.js'

export function LocaleProvider({ children }) {
  const [localeCode, setLocaleCode] = useState(defaultLocale)

  const locale = useMemo(
    () =>
      locales.find((localeOption) => localeOption.code === localeCode) ??
      locales[0],
    [localeCode],
  )

  useEffect(() => {
    document.documentElement.lang = locale.code
    document.documentElement.dir = locale.direction
  }, [locale])

  const value = useMemo(
    () => ({
      locale,
      locales,
      setLocale: setLocaleCode,
    }),
    [locale],
  )

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  )
}
