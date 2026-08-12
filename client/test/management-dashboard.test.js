import assert from 'node:assert/strict'
import test from 'node:test'

import { toManagementPropertyModel } from '../src/features/management/adapters/to-management-property-model.js'
import { createManagementPropertyApi } from '../src/features/management/api/management-property-api.js'
import {
  listingStatusChipClass,
  listingStatusTone,
  writableStatusesFor,
} from '../src/features/management/constants/listing-status-presentation.js'
import {
  rejectionReasonMaximumLength,
  rejectionReasonRemaining,
  validateRejectionReason,
} from '../src/features/management/forms/rejection-form.js'
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
  for (const locale of ['ar', 'en', 'de', 'tr']) {
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

test('has complete moderation interface text in every locale', () => {
  for (const locale of ['ar', 'en', 'de', 'tr']) {
    for (const key of [
      'listingStatuses.pending_review',
      'listingStatuses.rejected',
      'dashboard.navigation.review',
      'dashboard.actions.editAndResubmit',
      'dashboard.properties.pendingNotice',
      'dashboard.properties.rejectedNotice',
      'dashboard.properties.rejectionReasonLabel',
      'propertyCreate.submitted.title',
      'propertyCreate.submitted.description',
      'propertyCreate.submitted.action',
      'review.title',
      'review.queue.emptyTitle',
      'review.queue.errorTitle',
      'review.queue.loading',
      'review.actions.approve',
      'review.actions.reject',
      'review.approve.title',
      'review.approve.confirm',
      'review.reject.title',
      'review.reject.reasonLabel',
      'review.reject.validation.required',
      'review.reject.validation.length',
      'review.reject.validation.html',
      'review.feedback.network',
      'review.feedback.missing',
      'review.feedback.unexpected',
    ]) {
      assert.notEqual(translate(messages, locale, 'en', key), key)
    }

    // The badge and the queue total are counted messages, so they must resolve
    // through a plural rule rather than returning the key.
    for (const key of [
      'dashboard.navigation.reviewBadgeLabel',
      'review.queue.total',
    ]) {
      const message = translate(messages, locale, 'en', key, { count: 3 })
      assert.notEqual(message, key)
      assert.match(message, /3/)
    }
  }
})

test('gives each listing status its own chip appearance', () => {
  assert.equal(listingStatusTone('pending_review'), 'pending')
  assert.equal(listingStatusTone('rejected'), 'danger')
  assert.equal(listingStatusTone('available'), 'success')
  assert.equal(listingStatusTone('draft'), 'neutral')
  // An unknown status from a newer API is drawn quietly rather than crashing.
  assert.equal(listingStatusTone('something-new'), 'muted')

  assert.match(listingStatusChipClass('pending_review'), /warning/)
  assert.match(listingStatusChipClass('rejected'), /error/)
  assert.match(listingStatusChipClass('available'), /success/)
})

test('offers only the statuses each role may write', () => {
  const owner = writableStatusesFor('OWNER')
  const administrator = writableStatusesFor('ADMIN')

  // An owner cannot publish itself under moderation.
  assert.equal(owner.includes('available'), false)
  assert.deepEqual(owner, ['draft', 'reserved', 'sold', 'rented', 'archived'])
  assert.equal(administrator.includes('available'), true)
  // Neither role writes a moderation state by hand.
  for (const statuses of [owner, administrator]) {
    assert.equal(statuses.includes('pending_review'), false)
    assert.equal(statuses.includes('rejected'), false)
  }
})

test('carries the moderation state of a listing into the model', () => {
  const base = {
    id: 'property-id',
    slug: 'damascus-home',
    titleEn: 'Damascus home',
    transaction: 'BUY',
    propertyType: 'HOUSE',
    governorate: 'DAMASCUS',
    city: 'Damascus',
    price: '250000',
    currency: 'USD',
    createdAt: '2026-07-20T12:00:00.000Z',
    updatedAt: '2026-07-25T12:00:00.000Z',
    images: [],
  }

  const pending = toManagementPropertyModel(
    { ...base, status: 'PENDING_REVIEW', rejectionReason: null },
    'en',
    translator('en'),
  )
  const rejected = toManagementPropertyModel(
    {
      ...base,
      status: 'REJECTED',
      rejectionReason: 'The photographs do not show the property.',
    },
    'en',
    translator('en'),
  )

  assert.equal(pending.awaitingReview, true)
  assert.equal(pending.rejected, false)
  assert.equal(pending.rejectionReason, '')
  assert.equal(pending.statusLabel, 'Pending review')

  assert.equal(rejected.rejected, true)
  assert.equal(rejected.awaitingReview, false)
  assert.equal(
    rejected.rejectionReason,
    'The photographs do not show the property.',
  )
  assert.match(rejected.statusChipClass, /error/)
})

test('counts the review queue from the paginated total', async () => {
  let captured
  const api = createManagementPropertyApi({
    async request(path) {
      captured = path
      return {
        data: [{ id: 'property-id' }],
        meta: { page: 1, pageSize: 1, total: 7, totalPages: 7 },
      }
    },
  })

  const count = await api.fetchPendingReviewCount()

  // One row is enough: the badge reads `meta.total`, not the page.
  assert.equal(
    captured,
    '/api/v1/management/properties?page=1&pageSize=1&sort=updated-newest&status=PENDING_REVIEW',
  )
  assert.equal(count, 7)
})

test('requests the review queue page by status', async () => {
  let captured
  const api = createManagementPropertyApi({
    async request(path) {
      captured = path
      return { data: [], meta: { page: 2, pageSize: 20, total: 0, totalPages: 0 } }
    },
  })

  await api.fetchProperties({ page: 2, status: 'PENDING_REVIEW' })

  assert.equal(
    captured,
    '/api/v1/management/properties?page=2&pageSize=20&sort=updated-newest&status=PENDING_REVIEW',
  )
})

test('posts an approval and a rejection to the moderation endpoints', async () => {
  const calls = []
  const api = createManagementPropertyApi({
    async request(path, options) {
      calls.push({ options, path })
      return { data: { id: 'property-id', status: 'AVAILABLE' } }
    },
  })

  await api.approveProperty('property-id')
  await api.rejectProperty('property-id', '  Photographs are unclear.  ')

  assert.deepEqual(calls[0], {
    options: { body: undefined, method: 'POST', signal: undefined },
    path: '/api/v1/management/properties/property-id/approve',
  })
  assert.equal(calls[1].path, '/api/v1/management/properties/property-id/reject')
  assert.equal(calls[1].options.method, 'POST')
  // Trimmed before it leaves, so the stored note never carries stray padding.
  assert.deepEqual(calls[1].options.body, {
    reason: 'Photographs are unclear.',
  })
})

test('validates a rejection reason the way the API does', () => {
  assert.equal(validateRejectionReason('Photographs are unclear.'), '')
  assert.equal(validateRejectionReason(''), 'required')
  assert.equal(validateRejectionReason('   '), 'required')
  assert.equal(validateRejectionReason(undefined), 'required')
  assert.equal(
    validateRejectionReason('x'.repeat(rejectionReasonMaximumLength + 1)),
    'length',
  )
  assert.equal(validateRejectionReason('x'.repeat(rejectionReasonMaximumLength)), '')
  assert.equal(validateRejectionReason('<script>alert(1)</script>'), 'html')
  assert.equal(rejectionReasonMaximumLength, 500)
  assert.equal(rejectionReasonRemaining('  four  '), 496)
  assert.equal(rejectionReasonRemaining('x'.repeat(600)), 0)
})
