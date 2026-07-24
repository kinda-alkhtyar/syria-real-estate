import { useEffect, useMemo, useState } from 'react'

import { defaultLocale, locales } from '../constants/locales.js'
import { translate } from '../i18n/translate.js'
import { messages } from '../i18n/messages/index.js'
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
    document.documentElement.dataset.theme = 'light'

    document.title = translate(
      messages,
      locale.code,
      defaultLocale,
      'meta.title',
    )

    const description = document.querySelector('meta[name="description"]')
    description?.setAttribute(
      'content',
      translate(
        messages,
        locale.code,
        defaultLocale,
        'meta.description',
      ),
    )
  }, [locale])

  const value = useMemo(
    () => ({
      locale,
      locales,
      setLocale: setLocaleCode,
      t: (key, variables) =>
        translate(messages, locale.code, defaultLocale, key, variables),
    }),
    [locale],
  )

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  )
}
