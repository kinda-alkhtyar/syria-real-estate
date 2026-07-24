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

export function translate(
  dictionaries,
  locale,
  fallbackLocale,
  key,
  variables,
) {
  const message =
    getMessage(dictionaries[locale], key) ??
    getMessage(dictionaries[fallbackLocale], key)

  if (typeof message !== 'string') {
    return key
  }

  return interpolate(message, variables)
}
