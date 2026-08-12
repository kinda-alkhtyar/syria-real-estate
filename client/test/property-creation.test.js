import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { createPropertyCreationApi } from '../src/features/management/api/property-creation-api.js'
import {
  createSubmissionGate,
  descriptionFieldForLocale,
  getPropertyCreationSuccessPath,
  isPropertyCreationDirty,
  parsePropertyCreationErrors,
  propertyCreationInitialValues,
  shouldWarnUnsavedChanges,
  titleFieldForLocale,
  toPropertyCreationPayload,
  toPropertyFormValues,
  validatePropertyCreation,
} from '../src/features/management/forms/property-creation-form.js'
import { locales } from '../src/constants/locales.js'
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
    neighborhood: 'Al-Malki',
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

test('creating copies the written title into the two titles the API also requires', () => {
  const payload = toPropertyCreationPayload(
    {
      ...propertyCreationInitialValues,
      titleAr: '  منزل عائلي  ',
      descriptionAr: 'وصف عربي',
      price: '175000.50',
      city: 'Damascus',
      area: '184.5',
    },
    { copyActiveTitle: true, localeCode: 'ar' },
  )

  assert.equal(titleFieldForLocale('ar'), 'titleAr')
  assert.equal(payload.titleAr, 'منزل عائلي')
  assert.equal(payload.titleEn, 'منزل عائلي')
  assert.equal(payload.titleDe, 'منزل عائلي')
  // Only the written description travels; the other two stay omitted.
  assert.equal(payload.descriptionAr, 'وصف عربي')
  assert.equal('descriptionEn' in payload, false)
  assert.equal('descriptionDe' in payload, false)
})

test('an owner submission carries no status of its own', () => {
  const values = {
    ...propertyCreationInitialValues,
    titleAr: 'منزل عائلي',
    descriptionAr: 'وصف',
    city: 'Damascus',
    price: '250000',
    area: '180',
  }

  // The owner create schema rejects an unknown key outright, and submitting is
  // what puts a listing into review, so the field never leaves the form.
  const ownerPayload = toPropertyCreationPayload(values, {
    copyActiveTitle: true,
    includeStatus: false,
    localeCode: 'ar',
  })
  const administratorPayload = toPropertyCreationPayload(
    { ...values, status: 'available' },
    { copyActiveTitle: true, localeCode: 'ar' },
  )

  assert.equal('status' in ownerPayload, false)
  assert.equal(administratorPayload.status, 'available')
})

test('editing leaves the titles and descriptions of other languages untouched', () => {
  // The management record carries all three stored titles, so they prefill the
  // form even though only the browsed one is shown.
  const stored = toPropertyFormValues({
    titleEn: 'Family home',
    titleAr: 'منزل عائلي',
    titleDe: 'Familienhaus',
    descriptionEn: 'English description',
    descriptionAr: 'وصف عربي',
    descriptionDe: null,
    transaction: 'BUY',
    propertyType: 'APARTMENT',
    status: 'AVAILABLE',
    price: '175000.50',
    currency: 'USD',
    governorate: 'DAMASCUS',
    city: 'Damascus',
    area: '184.5',
  })

  assert.equal(stored.titleAr, 'منزل عائلي')
  // The stored description of the browsed language pre-fills the single field.
  assert.equal(stored.descriptionAr, 'وصف عربي')
  assert.equal(stored.descriptionEn, 'English description')
  assert.equal(stored.descriptionDe, '')

  const payload = toPropertyCreationPayload(
    { ...stored, titleAr: 'منزل عائلي مجدد', descriptionAr: 'وصف محدث' },
    { copyActiveTitle: false, localeCode: 'ar' },
  )

  assert.equal(payload.titleAr, 'منزل عائلي مجدد')
  assert.equal(payload.titleEn, 'Family home')
  assert.equal(payload.titleDe, 'Familienhaus')
  // A rewritten description replaces the stored one; the untouched languages
  // travel back exactly as they were stored.
  assert.equal(payload.descriptionAr, 'وصف محدث')
  assert.equal(payload.descriptionEn, 'English description')
  assert.equal('descriptionDe' in payload, false)
})

test('editing accepts a blank description and omits it from the patch', () => {
  const stored = toPropertyFormValues({
    titleAr: 'منزل عائلي',
    descriptionAr: 'وصف عربي',
    transaction: 'BUY',
    propertyType: 'APARTMENT',
    status: 'AVAILABLE',
    price: '175000.50',
    currency: 'USD',
    governorate: 'DAMASCUS',
    city: 'Damascus',
    neighborhood: 'Al-Malki',
    area: '184.5',
  })
  const cleared = { ...stored, descriptionAr: '' }

  // Nothing to retype: an owner fixing a price submits with the field blank.
  assert.deepEqual(
    validatePropertyCreation(cleared, {
      localeCode: 'ar',
      requireDescription: false,
    }),
    {},
  )
  // Creating still demands one.
  assert.equal(
    validatePropertyCreation(cleared, { localeCode: 'ar' }).descriptionAr,
    'required',
  )

  const payload = toPropertyCreationPayload(cleared, {
    copyActiveTitle: false,
    localeCode: 'ar',
  })

  assert.equal('descriptionAr' in payload, false)
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

  assert.equal(errors.city, 'required')
  assert.equal(errors.neighborhood, 'required')
  assert.equal(errors.price, 'number')
  assert.equal(errors.area, 'positive')
  assert.equal(errors.latitude, 'latitude')
  assert.equal(errors.longitude, 'longitude')
  assert.equal(errors.bedrooms, 'integer')
  assert.deepEqual(validatePropertyCreation(validValues()), {})
})

// The form stopped collecting a district, so the only way a stored one survives
// an edit is by travelling back untouched. A blank one stays out of the payload
// entirely — sending `null` there would erase the legacy value.
test('carries a legacy district through an edit without clearing it', () => {
  const stored = toPropertyCreationPayload(
    validValues({ district: 'Old Damascus' }),
  )
  const blank = toPropertyCreationPayload(validValues())

  assert.equal(stored.district, 'Old Damascus')
  assert.equal('district' in blank, false)
})

test('requires only the browsed language title and description', () => {
  const arabicErrors = validatePropertyCreation(
    { ...propertyCreationInitialValues, city: 'Damascus', price: '1', area: '1' },
    { localeCode: 'ar' },
  )

  assert.equal(arabicErrors.titleAr, 'required')
  assert.equal(arabicErrors.titleEn, undefined)
  assert.equal(arabicErrors.titleDe, undefined)
  assert.equal(arabicErrors.descriptionAr, 'required')
  assert.equal(arabicErrors.descriptionEn, undefined)
  assert.equal(arabicErrors.descriptionDe, undefined)
  assert.equal(descriptionFieldForLocale('de'), 'descriptionDe')

  const values = validValues({ descriptionDe: 'Deutsche Beschreibung' })

  assert.deepEqual(
    validatePropertyCreation(values, { localeCode: 'de' }),
    {},
  )
  // The untouched languages stay out of the payload, as a blank optional field
  // always has.
  const payload = toPropertyCreationPayload(values)
  assert.equal(payload.descriptionDe, 'Deutsche Beschreibung')
  assert.equal('descriptionAr' in payload, false)
  assert.equal('descriptionEn' in payload, false)
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
      'propertyCreate.localizedField',
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

// The address step is governorate, city, neighbourhood and one free-text line —
// nothing else. The removed district label is asserted gone so no locale keeps a
// key the form can no longer show.
test('labels the whole address step in all four locales and drops the district', () => {
  for (const { code } of locales) {
    for (const key of [
      'propertyCreate.steps.location.title',
      'propertyCreate.steps.location.description',
      'propertyCreate.fields.governorate',
      'propertyCreate.fields.city',
      'propertyCreate.fields.neighborhood',
      'propertyCreate.fields.address',
    ]) {
      assert.notEqual(translate(messages, code, 'en', key), key)
    }
    assert.equal(
      messages[code].propertyCreate.fields.district,
      undefined,
    )
  }
})
