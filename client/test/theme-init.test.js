import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

import {
  resolveTheme,
  themeStorageKey,
} from '../src/context/theme-context.js'

const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

const styleSheets = ['tokens.css', 'globals.css', 'reset.css'].map((name) => ({
  name,
  // Comments are stripped so prose about the retired mechanisms never trips
  // the guards below.
  source: readFileSync(
    new URL(`../src/styles/${name}`, import.meta.url),
    'utf8',
  ).replace(/\/\*[\s\S]*?\*\//g, ''),
}))

/** The pre-paint block is the first inline script in the document head. */
function readPrePaintScript() {
  const match = indexHtml.match(/<script>([\s\S]*?)<\/script>/)
  assert.ok(match, 'index.html must keep an inline pre-paint script')
  return match[1]
}

/**
 * Runs the real pre-paint script against a fake browser so the shipped code —
 * not a copy of it — is what the assertions below describe.
 */
function runPrePaintScript({ stored, prefersDark }) {
  const classNames = new Set()
  const storage = new Map()

  if (stored !== undefined) {
    storage.set(themeStorageKey, stored)
  }

  const documentElement = {
    lang: 'en',
    dir: 'ltr',
    classList: {
      toggle(className, force) {
        if (force) {
          classNames.add(className)
        } else {
          classNames.delete(className)
        }
      },
    },
  }

  const context = {
    document: { documentElement },
    localStorage: {
      getItem: (key) => (storage.has(key) ? storage.get(key) : null),
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
    },
    matchMedia: (query) => ({
      matches: query.includes('dark') ? prefersDark : false,
    }),
  }

  vm.createContext(context)
  vm.runInContext(readPrePaintScript(), context)

  return { documentElement, isDark: classNames.has('dark'), storage }
}

test('a stored choice wins over the system preference', () => {
  assert.equal(resolveTheme('dark', false), 'dark')
  assert.equal(resolveTheme('light', true), 'light')

  assert.equal(runPrePaintScript({ stored: 'dark', prefersDark: false }).isDark, true)
  assert.equal(runPrePaintScript({ stored: 'light', prefersDark: true }).isDark, false)
})

test('a fresh open on a dark device paints dark', () => {
  assert.equal(resolveTheme(null, true), 'dark')
  assert.equal(runPrePaintScript({ prefersDark: true }).isDark, true)
})

test('a fresh open on a light device paints light', () => {
  assert.equal(resolveTheme(null, false), 'light')
  assert.equal(runPrePaintScript({ prefersDark: false }).isDark, false)
})

test('unknown stored values fall back to the system preference', () => {
  // `system` is what older builds used to store; it must read as "no choice".
  for (const stored of ['system', 'auto', '']) {
    assert.equal(resolveTheme(stored, true), 'dark')
    assert.equal(runPrePaintScript({ stored, prefersDark: true }).isDark, true)
    assert.equal(runPrePaintScript({ stored, prefersDark: false }).isDark, false)
  }
})

test('the pre-paint script drives the dark class and nothing else', () => {
  const script = readPrePaintScript()

  assert.match(script, /classList\.toggle\(\s*'dark'/)
  assert.doesNotMatch(script, /dataset\.theme/)
})

test('no stylesheet defines a competing dark palette', () => {
  for (const { name, source } of styleSheets) {
    assert.doesNotMatch(
      source,
      /prefers-color-scheme/,
      `${name} must not react to the system preference directly`,
    )
    assert.doesNotMatch(
      source,
      /\[data-theme/,
      `${name} must not keep the retired data-theme mechanism`,
    )
  }
})

test('the single dark palette is the navy-and-gold brand one', () => {
  const tokens = styleSheets.find((sheet) => sheet.name === 'tokens.css').source
  const darkBlock = tokens.match(/:root\.dark\s*\{([\s\S]*?)\n\}/)

  assert.ok(darkBlock, 'tokens.css must define the dark palette on :root.dark')
  assert.match(darkBlock[1], /--home-gold:\s*#d9b268/)
  assert.match(darkBlock[1], /--primary-action:\s*#d9b268/)
  assert.match(darkBlock[1], /--surface:\s*#12243b/)
  assert.match(darkBlock[1], /color-scheme:\s*dark/)
})
