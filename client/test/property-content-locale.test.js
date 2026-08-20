import assert from 'node:assert/strict'
import test from 'node:test'

import { fromPropertyApi } from '../src/features/properties/adapters/from-property-api.js'

const apiProperty = {
  id: '11111111-1111-1111-1111-111111111111',
  slug: 'damascus-listing',
  titleAr: 'شقة مفروشة في دمشق',
  titleEn: 'Furnished flat in Damascus',
  titleDe: 'Moeblierte Wohnung in Damaskus',
  titleTr: 'Sam da mobilyali daire',
  descriptionAr: 'شقة واسعة قرب المركز.',
  descriptionEn: 'A spacious flat near the centre.',
  descriptionDe: 'Eine geraeumige Wohnung nahe dem Zentrum.',
  descriptionTr: 'Merkeze yakin genis daire.',
  transaction: 'RENT',
  propertyType: 'APARTMENT',
  status: 'AVAILABLE',
  price: '450.00',
  currency: 'USD',
  governorate: 'DAMASCUS',
  city: 'Damascus',
  area: '120.00',
  createdAt: '2026-08-20T00:00:00.000Z',
  images: [],
}

test('a Turkish visitor reads the Turkish title and description', () => {
  const listing = fromPropertyApi(apiProperty, 'tr')

  assert.equal(listing.title, 'Sam da mobilyali daire')
  assert.equal(listing.description, 'Merkeze yakin genis daire.')
})

test('a listing without Turkish content falls back to the Arabic source', () => {
  // What every listing created before the Turkish columns existed looks like:
  // both are null until a backfill or a new translation fills them.
  const listing = fromPropertyApi(
    { ...apiProperty, titleTr: null, descriptionTr: null },
    'tr',
  )

  assert.equal(listing.title, apiProperty.titleAr)
  assert.equal(listing.description, apiProperty.descriptionAr)
})

test('Turkish content does not leak into the other locales', () => {
  for (const [localeCode, title, description] of [
    ['ar', apiProperty.titleAr, apiProperty.descriptionAr],
    ['en', apiProperty.titleEn, apiProperty.descriptionEn],
    ['de', apiProperty.titleDe, apiProperty.descriptionDe],
  ]) {
    const listing = fromPropertyApi(apiProperty, localeCode)

    assert.equal(listing.title, title)
    assert.equal(listing.description, description)
  }
})

test('an unknown locale still reads a title rather than an empty card', () => {
  const listing = fromPropertyApi(apiProperty, 'fr')

  assert.equal(listing.title, apiProperty.titleAr)
})
