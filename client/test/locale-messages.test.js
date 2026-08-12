import assert from 'node:assert/strict'
import test from 'node:test'

import { locales } from '../src/constants/locales.js'
import { messages } from '../src/i18n/messages/index.js'

const pluralCategories = new Set([
  'zero',
  'one',
  'two',
  'few',
  'many',
  'other',
])

/**
 * Plural containers are leaves for parity purposes: CLDR gives every language
 * a different set of categories (Arabic has six, English/German/Turkish two),
 * so their inner keys are allowed to differ while the container must not.
 */
function isPluralContainer(value) {
  const keys = Object.keys(value)
  return keys.length > 0 && keys.every((key) => pluralCategories.has(key))
}

function collectKeys(dictionary, prefix = '') {
  return Object.entries(dictionary).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key

    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !isPluralContainer(value)
    ) {
      return collectKeys(value, path)
    }

    return [path]
  })
}

function readValue(dictionary, path) {
  return path.split('.').reduce((value, segment) => value?.[segment], dictionary)
}

const localeCodes = locales.map((locale) => locale.code)
const referenceLocale = 'en'
const referenceKeys = collectKeys(messages[referenceLocale])

test('every registered locale has a message dictionary', () => {
  assert.deepEqual(localeCodes.sort(), ['ar', 'de', 'en', 'tr'])

  for (const code of localeCodes) {
    assert.ok(messages[code], `missing dictionary for locale "${code}"`)
  }
})

test('all locale files share an identical key set', () => {
  for (const code of localeCodes) {
    const localeKeys = collectKeys(messages[code])

    const missing = referenceKeys.filter((key) => !localeKeys.includes(key))
    const extra = localeKeys.filter((key) => !referenceKeys.includes(key))

    assert.deepEqual(missing, [], `${code}.js is missing keys`)
    assert.deepEqual(extra, [], `${code}.js has keys absent from en.js`)
  }
})

test('every message resolves to a non-empty string, plural set, or list', () => {
  for (const code of localeCodes) {
    for (const key of referenceKeys) {
      const value = readValue(messages[code], key)
      const reference = readValue(messages[referenceLocale], key)

      if (Array.isArray(reference)) {
        assert.ok(Array.isArray(value), `${code}.js: ${key} must be a list`)
        assert.equal(
          value.length,
          reference.length,
          `${code}.js: ${key} has a different item count`,
        )
        continue
      }

      if (typeof value === 'object' && value !== null) {
        assert.ok(
          isPluralContainer(value) && typeof value.other === 'string',
          `${code}.js: ${key} must provide an "other" plural form`,
        )
        continue
      }

      assert.equal(typeof value, 'string', `${code}.js: ${key} must be a string`)
      assert.notEqual(value.trim(), '', `${code}.js: ${key} must not be empty`)
    }
  }
})

test('each locale names itself and every other locale', () => {
  for (const code of localeCodes) {
    for (const otherCode of localeCodes) {
      assert.equal(
        typeof messages[code].languages[otherCode],
        'string',
        `${code}.js is missing languages.${otherCode}`,
      )
    }
  }
})

test('interpolation placeholders match the reference locale', () => {
  const placeholderPattern = /\{(\w+)\}/g

  function placeholders(value) {
    if (typeof value !== 'string') return []
    return [...value.matchAll(placeholderPattern)].map((match) => match[1]).sort()
  }

  for (const code of localeCodes) {
    for (const key of referenceKeys) {
      const reference = readValue(messages[referenceLocale], key)
      if (typeof reference !== 'string') continue

      assert.deepEqual(
        placeholders(readValue(messages[code], key)),
        placeholders(reference),
        `${code}.js: ${key} has different placeholders`,
      )
    }
  }
})
