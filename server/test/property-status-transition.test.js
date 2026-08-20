import assert from 'node:assert/strict'
import { test } from 'node:test'

process.env.CORS_ORIGINS = 'https://client.example'

const { createPropertyManagementService } = await import(
  '../src/services/property.service.js'
)

const owner = {
  id: '11111111-1111-4111-8111-111111111111',
  role: 'OWNER',
}
const otherOwner = {
  id: '22222222-2222-4222-8222-222222222222',
  role: 'OWNER',
}
const administrator = {
  id: '33333333-3333-4333-8333-333333333333',
  role: 'ADMIN',
}
const propertyId = '44444444-4444-4444-8444-444444444444'

// Every column serializeProperty touches, so a mock write can be handed back
// through the real serializer instead of a shape only this suite understands.
function storedProperty(status) {
  return {
    id: propertyId,
    slug: '9f1c0f1e-0000-4000-8000-000000000000',
    ownerId: owner.id,
    status,
    titleEn: 'Family home',
    titleAr: 'منزل عائلي',
    titleDe: 'Familienhaus',
    descriptionEn: null,
    descriptionAr: null,
    descriptionDe: null,
    transaction: 'buy',
    propertyType: 'house',
    price: 250000,
    currency: 'usd',
    governorate: 'damascus',
    city: 'Damascus',
    district: null,
    neighborhood: null,
    address: null,
    bedrooms: null,
    bathrooms: null,
    area: 180,
    latitude: null,
    longitude: null,
    whatsapp: null,
    featured: false,
    rejectionReason: null,
    createdAt: new Date('2026-07-25T12:00:00.000Z'),
    updatedAt: new Date('2026-07-25T12:00:00.000Z'),
    images: [],
  }
}

// A listing entering review alerts a moderator on Telegram; stubbed so this
// suite never reaches the network.
const silentNotifier = { async notifyPendingReview() {} }

function createService(status) {
  const record = storedProperty(status)
  const calls = { moderation: [], updates: [] }
  const repository = {
    async findPropertyOwnership(id) {
      return id === record.id
        ? { id: record.id, ownerId: record.ownerId, status: record.status }
        : null
    },
    async updateProperty(id, data) {
      calls.updates.push(data)
      Object.assign(record, data)
      return { ...record }
    },
    async updatePropertyModeration(id, data) {
      calls.moderation.push(data)
      Object.assign(record, data)
      return {
        id: record.id,
        slug: record.slug,
        status: record.status,
        rejectionReason: record.rejectionReason,
      }
    },
  }

  return {
    calls,
    record,
    service: createPropertyManagementService({
      notifier: silentNotifier,
      repository,
    }),
  }
}

async function rejectedWith(promise, { code, statusCode }) {
  const error = await promise.then(
    () => null,
    (thrown) => thrown,
  )
  assert.ok(error, 'expected the call to be rejected')
  assert.equal(error.code, code)
  assert.equal(error.statusCode, statusCode)
  return error
}

test('an owner cannot publish a listing that is still under review', async () => {
  const { calls, service } = createService('PENDING_REVIEW')

  await rejectedWith(
    service.updateProperty(propertyId, { status: 'RESERVED' }, owner),
    { code: 'STATUS_TRANSITION_FORBIDDEN', statusCode: 403 },
  )
  assert.deepEqual(calls.updates, [])
})

test('an owner cannot publish a rejected listing', async () => {
  const { calls, service } = createService('REJECTED')

  await rejectedWith(
    service.updateProperty(propertyId, { status: 'SOLD' }, owner),
    { code: 'STATUS_TRANSITION_FORBIDDEN', statusCode: 403 },
  )
  assert.deepEqual(calls.updates, [])
})

test('an owner cannot publish a draft listing', async () => {
  const { calls, service } = createService('DRAFT')

  await rejectedWith(
    service.updateProperty(propertyId, { status: 'RENTED' }, owner),
    { code: 'STATUS_TRANSITION_FORBIDDEN', statusCode: 403 },
  )
  assert.deepEqual(calls.updates, [])
})

test('an owner never writes AVAILABLE directly, published or not', async () => {
  const { calls, service } = createService('AVAILABLE')

  await rejectedWith(
    service.updateProperty(propertyId, { status: 'AVAILABLE' }, owner),
    { code: 'STATUS_TRANSITION_FORBIDDEN', statusCode: 403 },
  )
  assert.deepEqual(calls.updates, [])
})

test('an owner marks their own approved listing as reserved', async () => {
  const { calls, service } = createService('AVAILABLE')

  const property = await service.updateProperty(
    propertyId,
    { status: 'RESERVED' },
    owner,
  )

  assert.equal(property.status, 'RESERVED')
  assert.deepEqual(calls.updates, [{ status: 'RESERVED' }])
})

test('an owner still moves their listing between non-public statuses', async () => {
  for (const [current, next] of [
    ['REJECTED', 'DRAFT'],
    ['AVAILABLE', 'ARCHIVED'],
    ['ARCHIVED', 'DRAFT'],
  ]) {
    const { service } = createService(current)
    const property = await service.updateProperty(
      propertyId,
      { status: next },
      owner,
    )
    assert.equal(property.status, next)
  }
})

test('an edit that carries no status is untouched by the guard', async () => {
  const { calls, service } = createService('PENDING_REVIEW')

  await service.updateProperty(propertyId, { city: 'Aleppo' }, owner)

  assert.deepEqual(calls.updates, [{ city: 'Aleppo' }])
})

test('editing a rejected listing still resubmits it for review', async () => {
  const { calls, service } = createService('REJECTED')

  const property = await service.updateProperty(
    propertyId,
    { city: 'Aleppo' },
    owner,
  )

  assert.equal(property.status, 'PENDING_REVIEW')
  assert.deepEqual(calls.updates, [
    { city: 'Aleppo', status: 'PENDING_REVIEW', rejectionReason: null },
  ])
})

test('an owner cannot touch another owner listing, status or not', async () => {
  const { calls, service } = createService('AVAILABLE')

  await rejectedWith(
    service.updateProperty(propertyId, { status: 'RESERVED' }, otherOwner),
    { code: 'FORBIDDEN', statusCode: 403 },
  )
  await rejectedWith(
    service.updateProperty(propertyId, { city: 'Aleppo' }, otherOwner),
    { code: 'FORBIDDEN', statusCode: 403 },
  )
  await rejectedWith(service.deleteProperty(propertyId, otherOwner), {
    code: 'FORBIDDEN',
    statusCode: 403,
  })
  assert.deepEqual(calls.updates, [])
})

test('an administrator publishes a listing that is under review', async () => {
  const { calls, service } = createService('PENDING_REVIEW')

  const property = await service.updateProperty(
    propertyId,
    { status: 'AVAILABLE' },
    administrator,
  )

  assert.equal(property.status, 'AVAILABLE')
  assert.deepEqual(calls.updates, [{ status: 'AVAILABLE' }])
})

test('an administrator approves a listing through the moderation path', async () => {
  const { calls, service } = createService('PENDING_REVIEW')

  const property = await service.approveProperty(propertyId, administrator)

  assert.equal(property.status, 'AVAILABLE')
  assert.deepEqual(calls.moderation, [
    { status: 'AVAILABLE', rejectionReason: null },
  ])
})

test('the service refuses to approve for a caller who is not an administrator', async () => {
  for (const actor of [owner, { id: owner.id, role: 'USER' }, {}, undefined]) {
    const { calls, service } = createService('PENDING_REVIEW')

    await rejectedWith(service.approveProperty(propertyId, actor), {
      code: 'FORBIDDEN',
      statusCode: 403,
    })
    assert.deepEqual(calls.moderation, [])
  }
})

test('the service refuses to reject for a caller who is not an administrator', async () => {
  for (const actor of [owner, { id: owner.id, role: 'USER' }, {}, undefined]) {
    const { calls, service } = createService('PENDING_REVIEW')

    await rejectedWith(service.rejectProperty(propertyId, 'Blurry', actor), {
      code: 'FORBIDDEN',
      statusCode: 403,
    })
    assert.deepEqual(calls.moderation, [])
  }
})

test('an administrator rejects a listing with a reason', async () => {
  const { calls, service } = createService('PENDING_REVIEW')

  const property = await service.rejectProperty(
    propertyId,
    'Photos are blurry.',
    administrator,
  )

  assert.equal(property.status, 'REJECTED')
  assert.equal(property.rejectionReason, 'Photos are blurry.')
  assert.deepEqual(calls.moderation, [
    { status: 'REJECTED', rejectionReason: 'Photos are blurry.' },
  ])
})
