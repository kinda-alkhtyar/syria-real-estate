import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { createPropertyCreationApi } from '../src/features/management/api/property-creation-api.js'
import {
  createSubmissionGate,
  getPropertyCreationSuccessPath,
  isPropertyCreationDirty,
  parsePropertyCreationErrors,
  propertyCreationInitialValues,
  shouldWarnUnsavedChanges,
  toPropertyCreationPayload,
  validatePropertyCreation,
} from '../src/features/management/forms/property-creation-form.js'
import { messages } from '../src/i18n/messages/index.js'
import { translate } from '../src/i18n/translate.js'

function validValues(overrides = {}) {
  return {
    ...propertyCreationInitialValues,
    titleEn: 'Family home',
    titleAr: 'منزل عائلي',
    titleDe: 'Familienhaus',
    price: '175000.50',
    city: 'Damascus',
    area: '184.5',
    ...overrides,
  }
}

test('submits the accepted creation contract and resolves the dashboard redirect', async () => {
  let captured
  const api = createPropertyCreationApi({
    async request(path, options) {
      captured = { options, path }
      return {
        data: {
          id: 'property-id',
          slug: 'generated-server-side',
        },
      }
    },
  })
  const payload = toPropertyCreationPayload(validValues())

  const created = await api.createProperty(payload)

  assert.equal(captured.path, '/api/v1/properties')
  assert.equal(captured.options.method, 'POST')
  assert.deepEqual(captured.options.body, payload)
  assert.equal(created.id, 'property-id')
  assert.equal(getPropertyCreationSuccessPath(), '/dashboard')
})

test('preserves every localized value while changing the active language', () => {
  const values = validValues({
    descriptionEn: 'English description',
    descriptionAr: 'وصف عربي',
    descriptionDe: 'Deutsche Beschreibung',
  })
  const payload = toPropertyCreationPayload(values)

  assert.equal(payload.titleEn, 'Family home')
  assert.equal(payload.titleAr, 'منزل عائلي')
  assert.equal(payload.titleDe, 'Familienhaus')
  assert.equal(payload.descriptionEn, 'English description')
  assert.equal(payload.descriptionAr, 'وصف عربي')
  assert.equal(payload.descriptionDe, 'Deutsche Beschreibung')
})

test('validates required, numeric, and coordinate fields client-side', () => {
  const errors = validatePropertyCreation({
    ...propertyCreationInitialValues,
    price: '-1',
    area: '0',
    latitude: '91',
    longitude: '-181',
    bedrooms: '1.5',
  })

  assert.equal(errors.titleEn, 'required')
  assert.equal(errors.titleAr, 'required')
  assert.equal(errors.titleDe, 'required')
  assert.equal(errors.city, 'required')
  assert.equal(errors.price, 'number')
  assert.equal(errors.area, 'positive')
  assert.equal(errors.latitude, 'latitude')
  assert.equal(errors.longitude, 'longitude')
  assert.equal(errors.bedrooms, 'integer')
  assert.deepEqual(validatePropertyCreation(validValues()), {})
})

test('maps structured backend validation details only to known form fields', () => {
  assert.deepEqual(
    parsePropertyCreationErrors(
      'titleAr: Required; price: Must be positive; ownerId: Not allowed',
    ),
    {
      price: 'Must be positive',
      titleAr: 'Required',
    },
  )
})

test('prevents duplicate submissions until the active request finishes', () => {
  const gate = createSubmissionGate()

  assert.equal(gate.tryStart(), true)
  assert.equal(gate.tryStart(), false)
  gate.finish()
  assert.equal(gate.tryStart(), true)
})

test('warns only for unsaved changes that are not submitting or saved', () => {
  const changed = validValues()

  assert.equal(isPropertyCreationDirty(propertyCreationInitialValues), false)
  assert.equal(isPropertyCreationDirty(changed), true)
  assert.equal(
    shouldWarnUnsavedChanges({
      dirty: true,
      submitting: false,
      succeeded: false,
    }),
    true,
  )
  assert.equal(
    shouldWarnUnsavedChanges({
      dirty: true,
      submitting: true,
      succeeded: false,
    }),
    false,
  )
  assert.equal(
    shouldWarnUnsavedChanges({
      dirty: true,
      submitting: false,
      succeeded: true,
    }),
    false,
  )
})

test('mounts creation beneath the existing owner/admin guard and wires CTAs', () => {
  const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
  const headerSource = readFileSync(
    new URL('../src/components/layout/Header.jsx', import.meta.url),
    'utf8',
  )
  const mobileSource = readFileSync(
    new URL('../src/components/layout/MobileNavigation.jsx', import.meta.url),
    'utf8',
  )

  assert.match(appSource, /<Route element={<OwnerAdminRoute \/>}>/)
  assert.match(appSource, /path="properties\/new"/)
  assert.match(headerSource, /href="\/dashboard\/properties\/new"/)
  assert.match(mobileSource, /href="\/dashboard\/properties\/new"/)
})

test('has complete creation interface text in Arabic, English, and German', () => {
  for (const locale of ['ar', 'en', 'de']) {
    for (const key of [
      'propertyCreate.title',
      'propertyCreate.languageTabs',
      'propertyCreate.unsavedWarning',
      'propertyCreate.sections.localized',
      'propertyCreate.fields.title',
      'propertyCreate.fields.governorate',
      'propertyCreate.validation.required',
      'propertyCreate.feedback.network',
      'propertyCreate.actions.submit',
    ]) {
      assert.notEqual(translate(messages, locale, 'en', key), key)
    }
  }
})
