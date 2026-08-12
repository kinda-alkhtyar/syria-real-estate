import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { LocaleContext } from '../src/context/locale-context.js'
import DeletePropertyDialog from '../src/features/management/components/DeletePropertyDialog.jsx'
import { createManagementPropertyApi } from '../src/features/management/api/management-property-api.js'
import { locales } from '../src/constants/locales.js'
import { messages } from '../src/i18n/messages/index.js'
import { translate } from '../src/i18n/translate.js'

const propertyTitle = 'Damascus courtyard house'

/**
 * The dialog only reads `t`, but the value carries the whole shape a consumer
 * of the provider would see, so the render exercises the real context.
 */
function localeValue(code) {
  const locale = locales.find((entry) => entry.code === code)
  return {
    locale,
    setLocale() {},
    t: (key, variables) => translate(messages, code, 'en', key, variables),
  }
}

function render(code, props = {}) {
  return renderToStaticMarkup(
    createElement(
      LocaleContext.Provider,
      { value: localeValue(code) },
      createElement(DeletePropertyDialog, {
        onCancel() {},
        onConfirm() {},
        propertyTitle,
        ...props,
      }),
    ),
  )
}

test('the delete dialog renders in every locale without a missing key', () => {
  for (const { code } of locales) {
    const markup = render(code)
    const t = (key, variables) => translate(messages, code, 'en', key, variables)

    // A key that has no message resolves to the key itself, so its presence in
    // the markup is exactly what "missing translation" looks like on screen.
    for (const key of [
      'dashboard.delete.title',
      'dashboard.delete.description',
      'dashboard.delete.warning',
      'dashboard.delete.confirm',
      'dashboard.delete.cancel',
    ]) {
      assert.ok(
        !markup.includes(key),
        `${code}: ${key} rendered as its own key`,
      )
    }

    assert.ok(markup.includes(t('dashboard.delete.title')), `${code}: title`)
    assert.ok(markup.includes(t('dashboard.delete.warning')), `${code}: warning`)
    assert.ok(markup.includes(t('dashboard.delete.confirm')), `${code}: confirm`)
    assert.ok(markup.includes(t('dashboard.delete.cancel')), `${code}: cancel`)
    // The title is interpolated rather than left as a placeholder.
    assert.ok(markup.includes(propertyTitle), `${code}: property title`)
    assert.ok(!markup.includes('{title}'), `${code}: unresolved placeholder`)
  }
})

test('the delete dialog is an accessible modal in every locale', () => {
  for (const { code } of locales) {
    const markup = render(code)

    assert.match(markup, /role="dialog"/, `${code}: role`)
    assert.match(markup, /aria-modal="true"/, `${code}: aria-modal`)
    assert.match(markup, /aria-labelledby="/, `${code}: labelled by its title`)
    assert.match(markup, /aria-describedby="/, `${code}: described by its body`)
    assert.match(markup, /type="submit"/, `${code}: confirm submits`)
  }
})

test('the confirm button is the danger one and the error is announced', () => {
  const markup = render('ar', { errorMessage: 'تعذر الحذف' })

  assert.match(markup, /bg-error text-canvas/)
  assert.match(markup, /role="alert"/)
  assert.ok(markup.includes('تعذر الحذف'))
})

test('a pending delete disables both decisions', () => {
  const markup = render('en', { pending: true })

  assert.equal(markup.match(/disabled=""/g)?.length, 2)
  assert.match(markup, /animate-spin/)
})

test('deletes a property through the management endpoint', async () => {
  let captured
  const api = createManagementPropertyApi({
    async request(path, options) {
      captured = { options, path }
      return { data: { id: 'property-id' } }
    },
  })
  const controller = new AbortController()

  const deleted = await api.deleteProperty('property-id', {
    signal: controller.signal,
  })

  assert.deepEqual(captured, {
    options: {
      body: undefined,
      method: 'DELETE',
      signal: controller.signal,
    },
    path: '/api/v1/management/properties/property-id',
  })
  assert.deepEqual(deleted, { id: 'property-id' })
})

test('the card offers deletion at every status and refreshes on success', () => {
  const source = readFileSync(
    new URL(
      '../src/features/management/components/ManagementPropertyList.jsx',
      import.meta.url,
    ),
    'utf8',
  )

  // The trash button sits outside the archived/published branch, so it is drawn
  // for every listing rather than for a subset of statuses.
  assert.ok(source.includes('<Trash2'))
  assert.ok(source.includes('dashboard.actions.deleteLabel'))
  assert.ok(source.includes('DeletePropertyDialog'))
  assert.ok(source.includes('await deleteProperty(deletionId)'))
  assert.ok(source.includes('onPropertyChanged?.()'))
  assert.equal(source.includes('window.confirm(t(`dashboard.delete'), false)
})

test('the dashboard recounts the review badge when a listing changes', () => {
  const source = readFileSync(
    new URL('../src/pages/DashboardPage.jsx', import.meta.url),
    'utf8',
  )

  assert.ok(source.includes('useOutletContext'))
  assert.ok(source.includes('refreshPendingCount?.()'))
  assert.ok(source.includes('onPropertyChanged={handlePropertyChanged}'))
})
