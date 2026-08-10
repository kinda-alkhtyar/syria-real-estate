import assert from 'node:assert/strict'
import test from 'node:test'

import { toManagementPropertyModel } from '../src/features/management/adapters/to-management-property-model.js'
import { createManagementPropertyApi } from '../src/features/management/api/management-property-api.js'
import { messages } from '../src/i18n/messages/index.js'
import { translate } from '../src/i18n/translate.js'

function translator(locale) {
  return (key, variables) =>
    translate(messages, locale, 'en', key, variables)
}

test('requests the protected management endpoint with stable pagination', async () => {
  let captured
  const api = createManagementPropertyApi({
    async request(path, options) {
      captured = { options, path }
      return {
        data: [],
        meta: { page: 2, pageSize: 20, total: 0, totalPages: 0 },
      }
    },
  })
  const controller = new AbortController()

  await api.fetchProperties({
    page: 2,
    pageSize: 20,
    signal: controller.signal,
  })

  assert.equal(
    captured.path,
    '/api/v1/management/properties?page=2&pageSize=20&sort=updated-newest',
  )
  assert.equal(captured.options.signal, controller.signal)
})

test('creates a localized dashboard-safe property model', () => {
  const record = {
    id: 'property-id',
    ownerId: 'must-not-appear',
    slug: 'damascus-home',
    titleEn: 'Damascus home',
    titleAr: 'منزل دمشقي',
    titleDe: 'Haus in Damaskus',
    transaction: 'BUY',
    propertyType: 'HOUSE',
    status: 'DRAFT',
    governorate: 'DAMASCUS',
    city: 'Damascus',
    district: null,
    neighborhood: null,
    address: null,
    price: '250000',
    currency: 'USD',
    updatedAt: '2026-07-25T12:00:00.000Z',
    storagePath: 'must-not-appear',
    images: [
      {
        id: 'image-id',
        url: 'https://images.example/home.webp',
        altEn: 'Home',
        altAr: 'منزل',
        altDe: 'Haus',
        width: 960,
        height: 720,
        sortOrder: 0,
        storagePath: 'must-not-appear',
      },
    ],
  }

  const model = toManagementPropertyModel(record, 'ar', translator('ar'))
  const serialized = JSON.stringify(model)

  assert.equal(model.title, 'منزل دمشقي')
  assert.equal(model.statusLabel, 'مسودة')
  assert.equal(model.image.alt, 'منزل')
  assert.ok(!serialized.includes('ownerId'))
  assert.ok(!serialized.includes('storagePath'))
  assert.ok(!serialized.includes('must-not-appear'))
})

test('has complete dashboard interface text in every locale', () => {
  for (const locale of ['ar', 'en', 'de']) {
    for (const key of [
      'dashboard.title',
      'dashboard.navigation.label',
      'dashboard.properties.loading',
      'dashboard.properties.emptyTitle',
      'dashboard.properties.errorTitle',
      'dashboard.actions.edit',
      'listingStatuses.draft',
      'listingStatuses.archived',
    ]) {
      assert.notEqual(translate(messages, locale, 'en', key), key)
    }
  }
})
