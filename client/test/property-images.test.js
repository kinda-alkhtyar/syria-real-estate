import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  altFieldForLocale,
  createPropertyImageApi,
} from '../src/features/management/api/property-image-api.js'
import { toManagementPropertyModel } from '../src/features/management/adapters/to-management-property-model.js'

const propertyId = 'property-id'
const imageFile = new Blob(['image'], { type: 'image/webp' })

function recordingApi(response = { data: { id: 'image-id' } }) {
  const calls = []
  const api = createPropertyImageApi({
    async request(path, options) {
      calls.push({ options, path })
      return response
    },
  })
  return { api, calls }
}

function altEntries(body) {
  return [...body.entries()].filter(([key]) => key.startsWith('alt'))
}

test('maps the interface language to its alt-text field', () => {
  assert.equal(altFieldForLocale('en'), 'altEn')
  assert.equal(altFieldForLocale('ar'), 'altAr')
  assert.equal(altFieldForLocale('de'), 'altDe')
  assert.equal(altFieldForLocale('fr'), '')
})

test('uploads the alt text of the active locale only', async () => {
  const { api, calls } = recordingApi()

  await api.uploadImage(propertyId, imageFile, {
    [altFieldForLocale('ar')]: 'منزل في دمشق',
  })

  assert.equal(calls.length, 1)
  assert.deepEqual(altEntries(calls[0].options.body), [
    ['altAr', 'منزل في دمشق'],
  ])
})

test('omits a blank alt text instead of sending an empty field', async () => {
  const { api, calls } = recordingApi()

  await api.uploadImage(propertyId, imageFile, { altEn: '   ' })

  assert.deepEqual(altEntries(calls[0].options.body), [])
  assert.ok(calls[0].options.body.get('image'))
})

test('reordering, promoting, and deleting never carry alt text', async () => {
  const { api, calls } = recordingApi({ data: [] })

  await api.reorderImages(propertyId, ['a', 'b'])
  await api.setPrimaryImage(propertyId, 'b')
  await api.deleteImage(propertyId, 'b')

  for (const call of calls) {
    const body = call.options.body ?? {}
    assert.deepEqual(
      Object.keys(body).filter((key) => key.startsWith('alt')),
      [],
    )
  }
})

// The public adapter pulls in the editorial catalog and its bundled images, so
// it is asserted at the source level rather than imported into the runner.
test('renders public images with the shared translation fallback', () => {
  const source = readFileSync(
    new URL(
      '../src/features/properties/adapters/from-property-api.js',
      import.meta.url,
    ),
    'utf8',
  )

  assert.match(source, /const translationFallbackOrder = \['ar', 'en', 'de'\]/)
  assert.equal(
    source.match(/localizedWithFallback\(image \?\? \{\}, 'alt', localeCode\)/g)
      ?.length,
    2,
  )
  assert.doesNotMatch(source, /localizedValue\((image|record) \?\? \{\}, 'alt'/)
})

test('keeps a management thumbnail described when only one alt is stored', () => {
  const record = {
    id: 'listing-id',
    slug: 'damascus-loft',
    titleEn: 'Loft',
    titleAr: 'شقة',
    titleDe: 'Loft',
    transaction: 'BUY',
    propertyType: 'APARTMENT',
    governorate: 'RIF_DIMASHQ',
    status: 'PUBLISHED',
    currency: 'USD',
    price: '100000',
    city: 'Damascus',
    updatedAt: '2026-07-25T12:00:00.000Z',
    images: [
      {
        id: 'image-id',
        url: 'https://images.example/loft.webp',
        altAr: 'شرفة',
        width: 960,
        height: 720,
      },
    ],
  }
  const t = (key) => key

  assert.equal(toManagementPropertyModel(record, 'en', t).image.alt, 'شرفة')
  assert.equal(toManagementPropertyModel(record, 'ar', t).image.alt, 'شرفة')
})

test('renders a single alt-text input bound to the active locale', () => {
  const source = readFileSync(
    new URL('../src/pages/PropertyImagesPage.jsx', import.meta.url),
    'utf8',
  )

  assert.equal(source.match(/name={altField}/g)?.length, 1)
  assert.doesNotMatch(source, /name="alt(En|Ar|De)"/)
  assert.match(source, /altFieldForLocale\(locale\.code\)/)
  assert.match(source, /\{ \[altField\]: data\.get\(altField\) \}/)
})
