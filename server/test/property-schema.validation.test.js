import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  propertyCreateSchema,
  propertyUpdateSchema,
} from '../src/validation/property.schema.js'
import { propertyImageUploadBodySchema } from '../src/validation/property-image.schema.js'

const validProperty = {
  titleEn: 'Courtyard house',
  titleAr: 'بيت بفناء',
  titleDe: 'Innenhofhaus',
  transaction: 'buy',
  propertyType: 'house',
  price: '250000.00',
  currency: 'usd',
  governorate: 'damascus',
  city: 'Damascus',
  area: '180.50',
}

function createWith(overrides) {
  return propertyCreateSchema.safeParse({ ...validProperty, ...overrides })
}

function messages(result) {
  return result.error.issues.map((issue) => issue.message).join('; ')
}

test('accepts the values a Decimal(_, 2) column can store exactly', () => {
  assert.equal(createWith({}).success, true)
  assert.equal(createWith({ price: '250000', area: '180' }).success, true)
  assert.equal(createWith({ price: 250_000.5, area: 180.5 }).success, true)
  // The top of each range must survive the round-trip check unchanged.
  assert.equal(
    createWith({ price: 999_999_999_999.99, area: 99_999_999.99 }).success,
    true,
  )
  assert.equal(
    createWith({ price: '999999999999.99', area: '99999999.99' }).success,
    true,
  )
})

test('refuses a caller-supplied slug on create and on update', () => {
  assert.equal(createWith({ slug: 'damascus-courtyard' }).success, false)
  assert.equal(
    propertyUpdateSchema.safeParse({ slug: 'damascus-courtyard' }).success,
    false,
  )
})

test('rejects a price or area finer than the column scale', () => {
  const stringPrice = createWith({ price: '100.126' })
  assert.equal(stringPrice.success, false)
  assert.match(messages(stringPrice), /price must have at most 2 decimal places/)

  const numberPrice = createWith({ price: 100.126 })
  assert.equal(numberPrice.success, false)
  assert.match(messages(numberPrice), /price must have at most 2 decimal places/)

  const stringArea = createWith({ area: '180.5001' })
  assert.equal(stringArea.success, false)
  assert.match(messages(stringArea), /area must have at most 2 decimal places/)

  const numberArea = createWith({ area: 180.5001 })
  assert.equal(numberArea.success, false)
  assert.match(messages(numberArea), /area must have at most 2 decimal places/)

  const update = propertyUpdateSchema.safeParse({ price: '1.005' })
  assert.equal(update.success, false)
  assert.match(messages(update), /price must have at most 2 decimal places/)
})

test('still allows coordinates their full six decimal places', () => {
  assert.equal(
    createWith({ latitude: '33.513805', longitude: '36.276527' }).success,
    true,
  )
})

test('rejects angle brackets in every free-text property field', () => {
  const fields = [
    ['titleEn', '<script>alert(1)</script>'],
    ['titleAr', 'بيت <b>فاخر</b>'],
    ['titleDe', 'Haus <img src=x onerror=alert(1)>'],
    ['descriptionEn', 'Lovely <script>alert(1)</script> home'],
    ['descriptionAr', 'وصف <b>عريض</b>'],
    ['descriptionDe', 'Beschreibung <i>kursiv</i>'],
    ['city', 'Damascus <span>'],
    ['district', 'Old City >'],
    ['neighborhood', '< Bab Touma'],
    ['address', '12 Straight Street <br>'],
  ]

  for (const [field, value] of fields) {
    const result = createWith({ [field]: value })
    assert.equal(result.success, false, `${field} should be rejected`)
    assert.match(messages(result), /text cannot contain HTML tags/)
  }
})

test('leaves ordinary text and explicit nulls untouched', () => {
  const result = createWith({
    descriptionEn: 'Quiet courtyard home, 3 rooms & a fountain.',
    district: null,
    address: 'No. 12, Straight Street',
  })

  assert.equal(result.success, true)
  assert.equal(result.data.district, null)
  assert.equal(result.data.address, 'No. 12, Straight Street')
})

test('rejects angle brackets in image alt text', () => {
  const rejected = propertyImageUploadBodySchema.safeParse({
    altEn: '<script>alert(1)</script>',
  })
  assert.equal(rejected.success, false)
  assert.match(messages(rejected), /text cannot contain HTML tags/)

  const accepted = propertyImageUploadBodySchema.safeParse({
    altEn: 'Courtyard seen from the fountain',
  })
  assert.equal(accepted.success, true)
})

test('accepts WhatsApp numbers from any country and stores them normalized', () => {
  const cases = [
    // Turkey, Germany, Austria and Syria in the separator styles each country
    // is usually written with.
    { input: '+90 532 123 45 67', stored: '+905321234567' },
    { input: '+49 151 23456789', stored: '+4915123456789' },
    { input: '+43 (664) 123-4567', stored: '+436641234567' },
    { input: '+963 944 123 456', stored: '+963944123456' },
    // No country code: kept as digits so the owner still recognises it.
    { input: '0944 123 456', stored: '0944123456' },
  ]

  for (const { input, stored } of cases) {
    const result = createWith({ whatsapp: input })
    assert.equal(result.success, true, `${input} should be accepted`)
    assert.equal(result.data.whatsapp, stored)
  }

  // Absent and explicitly cleared are both valid: the column is nullable.
  assert.equal(createWith({}).success, true)
  const cleared = propertyUpdateSchema.safeParse({ whatsapp: null })
  assert.equal(cleared.success, true)
  assert.equal(cleared.data.whatsapp, null)
})

test('rejects WhatsApp numbers with letters, symbols, or an implausible length', () => {
  for (const whatsapp of [
    'call me',
    '+963 944 abc',
    '963/944/123456',
    '++963944123456',
    '963+944123456',
    '12345',
    '9639441234567890123',
  ]) {
    assert.equal(
      createWith({ whatsapp }).success,
      false,
      `${whatsapp} should be rejected`,
    )
  }
})
