function getMessage(dictionary, key) {
  return key.split('.').reduce((value, segment) => value?.[segment], dictionary)
}

function interpolate(message, variables) {
  if (!variables) {
    return message
  }

  return message.replace(/\{(\w+)\}/g, (match, variableName) => {
    const value = variables[variableName]
    return value === undefined ? match : String(value)
  })
}

function selectPluralMessage(message, locale, variables) {
  if (
    !message ||
    typeof message !== 'object' ||
    variables?.count === undefined
  ) {
    return message
  }

  const count = Number(variables.count)
  if (!Number.isFinite(count)) return message.other

  const category = new Intl.PluralRules(locale).select(count)
  return message[category] ?? message.other
}

export function translate(
  dictionaries,
  locale,
  fallbackLocale,
  key,
  variables,
) {
  const localizedMessage =
    getMessage(dictionaries[locale], key) ??
    getMessage(dictionaries[fallbackLocale], key)
  const message = selectPluralMessage(localizedMessage, locale, variables)

  if (typeof message !== 'string') {
    return key
  }

  return interpolate(message, variables)
}
