import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { LocaleContext } from '../src/context/locale-context.js'
import DeleteOfficeDialog from '../src/features/offices/components/DeleteOfficeDialog.jsx'
import { locales } from '../src/constants/locales.js'
import { messages } from '../src/i18n/messages/index.js'
import { translate } from '../src/i18n/translate.js'

const officeName = 'Damascus Real Estate Office'

function localeValue(code) {
  return {
    locale: locales.find((entry) => entry.code === code),
    setLocale() {},
    t: (key, variables) => translate(messages, code, 'en', key, variables),
  }
}

function render(code, props = {}) {
  return renderToStaticMarkup(
    createElement(
      LocaleContext.Provider,
      { value: localeValue(code) },
      createElement(DeleteOfficeDialog, {
        officeName,
        onCancel() {},
        onConfirm() {},
        ...props,
      }),
    ),
  )
}

const dialogKeys = [
  'officeForm.delete.title',
  'officeForm.delete.description',
  'officeForm.delete.warning',
  'officeForm.delete.propertiesNotice',
  'officeForm.delete.confirm',
  'officeForm.delete.cancel',
]

test('the office delete dialog renders in every locale without a missing key', () => {
  for (const { code } of locales) {
    const markup = render(code)
    const t = (key, variables) => translate(messages, code, 'en', key, variables)

    // A key with no message resolves to the key itself, so finding one in the
    // markup is exactly what a missing translation looks like on screen.
    for (const key of dialogKeys) {
      assert.ok(!markup.includes(key), `${code}: ${key} rendered as its own key`)
    }

    assert.ok(markup.includes(t('officeForm.delete.title')), `${code}: title`)
    assert.ok(markup.includes(t('officeForm.delete.warning')), `${code}: warning`)
    assert.ok(markup.includes(t('officeForm.delete.confirm')), `${code}: confirm`)
    assert.ok(markup.includes(t('officeForm.delete.cancel')), `${code}: cancel`)
    assert.ok(markup.includes(officeName), `${code}: office name`)
    assert.ok(!markup.includes('{name}'), `${code}: unresolved placeholder`)
  }
})

// The fear this dialog exists to answer. It must be stated on the surface, in
// every language, not only in the description.
test('every locale promises the properties survive the deletion', () => {
  for (const { code } of locales) {
    const markup = render(code)
    const notice = translate(
      messages,
      code,
      'en',
      'officeForm.delete.propertiesNotice',
    )

    assert.ok(notice.length > 0, `${code}: notice is empty`)
    assert.ok(markup.includes(notice), `${code}: notice is not rendered`)
  }

  // The Arabic wording is the one the product specified verbatim.
  assert.equal(
    translate(messages, 'ar', 'en', 'officeForm.delete.propertiesNotice'),
    'عقاراتك لن تُحذف — ستبقى منشورة دون ربط بالمكتب.',
  )
})

test('the office delete dialog is an accessible modal in every locale', () => {
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
  const markup = render('ar', { errorMessage: 'تعذر حذف المكتب' })

  assert.match(markup, /bg-error text-canvas/)
  assert.match(markup, /role="alert"/)
  assert.ok(markup.includes('تعذر حذف المكتب'))
})

test('a pending deletion disables both decisions', () => {
  const markup = render('en', { pending: true })

  assert.equal(markup.match(/disabled=""/g)?.length, 2)
  assert.match(markup, /animate-spin/)
})

// office-api reaches the shared client through `apiRequest` rather than an
// injected one, and that client reads `import.meta.env`, which does not exist
// under Node. The request it builds is asserted at the source instead.
test('the office delete request is a DELETE on the office id', () => {
  const source = readFileSync(
    new URL('../src/features/offices/api/office-api.js', import.meta.url),
    'utf8',
  )

  assert.ok(source.includes('export async function deleteOffice'))
  assert.ok(
    source.includes('`/api/v1/offices/${encodeURIComponent(officeId)}`'),
  )
  assert.ok(source.includes("{ method: 'DELETE', signal }"))
})

test('the danger zone lives at the bottom of the edit page only', () => {
  const source = readFileSync(
    new URL('../src/pages/OfficeFormPage.jsx', import.meta.url),
    'utf8',
  )

  assert.ok(source.includes("mode === 'edit' && ("))
  assert.ok(source.includes('officeForm.delete.zoneTitle'))
  assert.ok(source.includes('officeForm.delete.action'))
  assert.ok(source.includes('DeleteOfficeDialog'))
  // Separated from the form rather than sitting among its fields.
  assert.ok(source.includes('mt-12 border-t border-line pt-8'))
  // The stored name, not the half-typed one in the form behind the dialog.
  assert.ok(source.includes('officeName={officeName}'))
  assert.ok(source.includes('setOfficeName(prefill.name)'))
  // A closed office has no detail page left to return to.
  assert.ok(source.includes("navigate('/offices', { replace: true })"))
})
