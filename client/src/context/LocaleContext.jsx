import { useEffect, useMemo, useState } from 'react'

import {
  defaultLocale,
  locales,
  localeStorageKey,
} from '../constants/locales.js'
import { translate } from '../i18n/translate.js'
import { messages } from '../i18n/messages/index.js'
import { LocaleContext } from './locale-context.js'

const defaultLocaleOption =
  locales.find((locale) => locale.code === defaultLocale) ?? locales[0]

function isSupportedLocale(localeCode) {
  return locales.some((locale) => locale.code === localeCode)
}

function getInitialLocale() {
  try {
    const storedLocale = window.localStorage.getItem(localeStorageKey)
    if (isSupportedLocale(storedLocale)) return storedLocale
  } catch {
    // Storage can be unavailable in privacy-restricted environments.
  }

  const documentLocale = document.documentElement.lang
  if (isSupportedLocale(documentLocale)) return documentLocale

  return defaultLocale
}

export function LocaleProvider({ children }) {
  const [localeCode, setLocaleCode] = useState(getInitialLocale)

  const locale = useMemo(
    () =>
      locales.find((localeOption) => localeOption.code === localeCode) ??
      defaultLocaleOption,
    [localeCode],
  )

  useEffect(() => {
    document.documentElement.lang = locale.code
    document.documentElement.dir = locale.direction

    try {
      window.localStorage.setItem(localeStorageKey, locale.code)
    } catch {
      // Storage can be unavailable in privacy-restricted environments.
    }

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
