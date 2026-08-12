import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'

import express from 'express'

process.env.CORS_ORIGINS = 'https://client.example'

const [
  { createPropertyRouter },
  { createPropertyManagementService },
  { requireRole },
  { default: errorMiddleware },
] = await Promise.all([
  import('../src/routes/property.routes.js'),
  import('../src/services/property.service.js'),
  import('../src/middleware/authentication.middleware.js'),
  import('../src/middleware/error.middleware.js'),
])

const ownerId = '11111111-1111-4111-8111-111111111111'
const otherOwnerId = '22222222-2222-4222-8222-222222222222'
const adminId = '33333333-3333-4333-8333-333333333333'
const propertyId = '44444444-4444-4444-8444-444444444444'
const allowedOrigin = 'https://client.example'
const now = new Date('2026-07-25T12:00:00.000Z')

const validProperty = {
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
  area: 180,
}

let records
// The mock stores a listing through publicRecord, which mirrors the public
// select and therefore drops rejectionReason. The submitted write is captured
// so a test can assert the column the server intended to clear.
let lastUpdateData

function publicRecord(data) {
  return {
    id: data.id,
    slug: data.slug,
    titleEn: data.titleEn,
    titleAr: data.titleAr,
    titleDe: data.titleDe,
    descriptionEn: data.descriptionEn ?? null,
    descriptionAr: data.descriptionAr ?? null,
    descriptionDe: data.descriptionDe ?? null,
    transaction: data.transaction,
    propertyType: data.propertyType,
    status: data.status ?? 'DRAFT',
    price: data.price,
    currency: data.currency,
    governorate: data.governorate,
    city: data.city,
    district: data.district ?? null,
    neighborhood: data.neighborhood ?? null,
    address: data.address ?? null,
    bedrooms: data.bedrooms ?? null,
    bathrooms: data.bathrooms ?? null,
    area: data.area,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    featured: data.featured ?? false,
    createdAt: data.createdAt ?? now,
    updatedAt: now,
    images: [],
    ownerId: data.ownerId,
    owner: { passwordHash: 'must-never-appear', sessions: ['private'] },
  }
}

function createMockRepository() {
  return {
    async createProperty(data) {
      if ([...records.values()].some((record) => record.slug === data.slug)) {
        const error = new Error('Unique constraint')
        error.code = 'P2002'
        error.meta = { target: ['slug'] }
        throw error
      }
      const record = publicRecord({ ...data, id: propertyId })
      records.set(record.id, record)
      return record
    },
    async findPropertyOwnership(id) {
      const record = records.get(id)
      return record
        ? { id: record.id, ownerId: record.ownerId, status: record.status }
        : null
    },
    async updateProperty(id, data) {
      lastUpdateData = data
      const record = publicRecord({ ...records.get(id), ...data, id })
      records.set(id, record)
      return record
    },
  }
}

function authenticate(request, _response, next) {
  const role = request.get('X-Test-Role')
  const id = request.get('X-Test-User')
  if (!role || !id) {
    const error = new Error('Authentication is required.')
    error.code = 'AUTHENTICATION_REQUIRED'
    error.statusCode = 401
    next(error)
    return
  }
  request.auth = { user: { id, name: 'Test user', role } }
  next()
}

const trustOrigin = (_request, _response, next) => next()
// Submitting a listing alerts a moderator on Telegram. That side channel has
// its own suite; here it is stubbed so the tests never reach the network.
const silentNotifier = { async notifyPendingReview() {} }
let baseUrl
let closeServer

before(async () => {
  const app = express()
  app.use(express.json())
  app.use(
    '/api/v1/properties',
    createPropertyRouter({
      managementService: createPropertyManagementService({
        notifier: silentNotifier,
        repository: createMockRepository(),
      }),
      authenticationMiddleware: authenticate,
      roleMiddleware: requireRole('OWNER', 'ADMIN'),
      originMiddleware: trustOrigin,
    }),
  )
  app.use(errorMiddleware)
  const server = app.listen(0)
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })
  baseUrl = `http://127.0.0.1:${server.address().port}`
  closeServer = () =>
    new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
})

after(async () => closeServer())

beforeEach(() => {
  records = new Map()
  lastUpdateData = undefined
})

async function request(
  path,
  { method = 'POST', body, userId = ownerId, role = 'OWNER' } = {},
) {
  const headers = {
    'Content-Type': 'application/json',
    Origin: allowedOrigin,
  }
  if (userId) {
    headers['X-Test-User'] = userId
    headers['X-Test-Role'] = role
  }
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
  }
}

function seedOwnedProperty(ownerIdValue = ownerId, overrides = {}) {
  const record = publicRecord({
    ...validProperty,
    id: propertyId,
    ownerId: ownerIdValue,
    slug: 'existing-property',
    ...overrides,
  })
  records.set(record.id, record)
}

test('denies unauthenticated and invalid-role writes', async () => {
  const unauthenticated = await request('/api/v1/properties', {
    body: validProperty,
    userId: null,
  })
  const invalidRole = await request('/api/v1/properties', {
    body: validProperty,
    role: 'USER',
  })

  assert.equal(unauthenticated.status, 401)
  assert.equal(invalidRole.status, 403)
})

test('owner creates a property owned by the authenticated user', async () => {
  const response = await request('/api/v1/properties', {
    body: validProperty,
  })

  assert.equal(response.status, 201)
  // The slug is generated server-side and matches the public `/:slug` pattern.
  assert.match(
    response.body.data.slug,
    /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/,
  )
  assert.equal(records.get(propertyId).ownerId, ownerId)
  assert.ok(!JSON.stringify(response.body).includes('passwordHash'))
  assert.ok(!JSON.stringify(response.body).includes('ownerId'))
})

test('owner cannot assign another owner or internal fields', async () => {
  for (const field of ['ownerId', 'id', 'createdAt']) {
    const response = await request('/api/v1/properties', {
      body: { ...validProperty, [field]: otherOwnerId },
    })
    assert.equal(response.status, 400)
    assert.equal(response.body.error.code, 'INVALID_REQUEST')
  }
})

test('owner updates their property with intentional null values', async () => {
  seedOwnedProperty()
  const response = await request(`/api/v1/properties/${propertyId}`, {
    method: 'PATCH',
    body: { district: null, price: 275000 },
  })

  assert.equal(response.status, 200)
  assert.equal(response.body.data.district, null)
  assert.equal(response.body.data.price, '275000')
})

test('owner cannot update another owner property', async () => {
  seedOwnedProperty(otherOwnerId)
  const response = await request(`/api/v1/properties/${propertyId}`, {
    method: 'PATCH',
    body: { city: 'Aleppo' },
  })

  assert.equal(response.status, 403)
  assert.equal(response.body.error.code, 'FORBIDDEN')
})

test('admin can manage any property', async () => {
  seedOwnedProperty(otherOwnerId)
  const response = await request(`/api/v1/properties/${propertyId}`, {
    method: 'PATCH',
    body: { city: 'Aleppo' },
    userId: adminId,
    role: 'ADMIN',
  })

  assert.equal(response.status, 200)
  assert.equal(response.body.data.city, 'Aleppo')
  assert.equal(records.get(propertyId).ownerId, otherOwnerId)
})

test('rejects a caller-supplied slug on create and on update', async () => {
  seedOwnedProperty()
  const created = await request('/api/v1/properties', {
    body: { ...validProperty, slug: 'damascus-family-home' },
  })
  const updated = await request(`/api/v1/properties/${propertyId}`, {
    method: 'PATCH',
    body: { slug: 'another-slug' },
  })

  assert.equal(created.status, 400)
  assert.equal(created.body.error.code, 'INVALID_REQUEST')
  assert.equal(updated.status, 400)
  assert.equal(updated.body.error.code, 'INVALID_REQUEST')
  assert.equal(records.get(propertyId).slug, 'existing-property')
})

test('returns a structured missing-property error', async () => {
  const missing = await request(
    '/api/v1/properties/55555555-5555-4555-8555-555555555555',
    {
      method: 'PATCH',
      body: { city: 'Homs' },
    },
  )

  assert.equal(missing.status, 404)
  assert.equal(missing.body.error.code, 'PROPERTY_NOT_FOUND')
})

test('a listing created by an office owner is attached to that office', async () => {
  let submitted
  const service = createPropertyManagementService({
    notifier: silentNotifier,
    repository: {
      findOfficeIdByOwner: async (id) =>
        id === ownerId ? { id: 'coffice00000000000000001' } : null,
      createProperty: async (data) => {
        submitted = data
        return publicRecord({ ...data, id: propertyId })
      },
    },
  })

  await service.createProperty(validProperty, { id: ownerId, role: 'OWNER' })
  assert.equal(submitted.officeId, 'coffice00000000000000001')

  await service.createProperty(validProperty, {
    id: otherOwnerId,
    role: 'OWNER',
  })
  // An owner without an office writes no officeId at all, leaving the column
  // to its default rather than sending an explicit null.
  assert.ok(!('officeId' in submitted))
})

test('maps a unique-slug violation onto a conflict error', async () => {
  const service = createPropertyManagementService({
    notifier: silentNotifier,
    repository: {
      createProperty() {
        const error = new Error('Unique constraint')
        error.code = 'P2002'
        error.meta = { target: ['slug'] }
        throw error
      },
    },
  })

  await assert.rejects(
    service.createProperty(validProperty, { id: ownerId, role: 'OWNER' }),
    (error) => error.code === 'PROPERTY_SLUG_CONFLICT' && error.statusCode === 409,
  )
})

test('rejects invalid input, unknown fields, and empty updates', async () => {
  seedOwnedProperty()
  const invalid = await request('/api/v1/properties', {
    body: { ...validProperty, area: 0 },
  })
  const unknown = await request(`/api/v1/properties/${propertyId}`, {
    method: 'PATCH',
    body: { arbitrary: true },
  })
  const empty = await request(`/api/v1/properties/${propertyId}`, {
    method: 'PATCH',
    body: {},
  })

  assert.equal(invalid.status, 400)
  assert.equal(unknown.status, 400)
  assert.equal(empty.status, 400)
})

test('archive and restore are idempotent lifecycle operations', async () => {
  seedOwnedProperty()
  const archive = await request(
    `/api/v1/properties/${propertyId}/archive`,
    { method: 'PATCH' },
  )
  const repeatedArchive = await request(
    `/api/v1/properties/${propertyId}/archive`,
    { method: 'PATCH' },
  )
  const restore = await request(
    `/api/v1/properties/${propertyId}/restore`,
    { method: 'PATCH' },
  )
  const repeatedRestore = await request(
    `/api/v1/properties/${propertyId}/restore`,
    { method: 'PATCH' },
  )

  assert.equal(archive.body.data.status, 'ARCHIVED')
  assert.equal(repeatedArchive.body.data.status, 'ARCHIVED')
  assert.equal(restore.body.data.status, 'DRAFT')
  assert.equal(repeatedRestore.body.data.status, 'DRAFT')
  assert.ok(!JSON.stringify(repeatedRestore.body).includes('owner'))
})

test('an owner submission enters review instead of going live', async () => {
  const response = await request('/api/v1/properties', {
    body: validProperty,
  })

  assert.equal(response.status, 201)
  assert.equal(response.body.data.status, 'PENDING_REVIEW')
  assert.equal(records.get(propertyId).status, 'PENDING_REVIEW')
})

test('an administrator still publishes instantly', async () => {
  const published = await request('/api/v1/properties', {
    body: { ...validProperty, status: 'available' },
    userId: adminId,
    role: 'ADMIN',
  })

  assert.equal(published.status, 201)
  assert.equal(published.body.data.status, 'AVAILABLE')
})

test('an owner cannot publish itself through a status write', async () => {
  seedOwnedProperty()
  // Absent from the owner create schema entirely: a new listing's state is not
  // the owner's to choose.
  const onCreate = await request('/api/v1/properties', {
    body: { ...validProperty, status: 'draft' },
  })
  const published = await request(`/api/v1/properties/${propertyId}`, {
    method: 'PATCH',
    body: { status: 'available' },
  })
  const pending = await request(`/api/v1/properties/${propertyId}`, {
    method: 'PATCH',
    body: { status: 'pending_review' },
  })
  const rejected = await request(`/api/v1/properties/${propertyId}`, {
    method: 'PATCH',
    body: { status: 'rejected' },
  })

  for (const response of [onCreate, published, pending, rejected]) {
    assert.equal(response.status, 400)
    assert.equal(response.body.error.code, 'INVALID_REQUEST')
  }
  assert.equal(records.get(propertyId).status, 'DRAFT')
})

test('editing a rejected listing resubmits it and clears the reason', async () => {
  seedOwnedProperty(ownerId, { status: 'REJECTED' })
  const response = await request(`/api/v1/properties/${propertyId}`, {
    method: 'PATCH',
    body: { titleEn: 'Corrected family home' },
  })

  assert.equal(response.status, 200)
  assert.equal(response.body.data.status, 'PENDING_REVIEW')
  assert.equal(lastUpdateData.rejectionReason, null)
})

test('an explicit owner status on a rejected listing is honoured', async () => {
  seedOwnedProperty(ownerId, { status: 'REJECTED' })
  const response = await request(`/api/v1/properties/${propertyId}`, {
    method: 'PATCH',
    body: { status: 'archived' },
  })

  // Archiving a rejected listing is a decision, not a resubmission.
  assert.equal(response.body.data.status, 'ARCHIVED')
  assert.equal('rejectionReason' in lastUpdateData, false)
})

test('an administrator edit never resubmits a rejected listing', async () => {
  seedOwnedProperty(otherOwnerId, { status: 'REJECTED' })
  const response = await request(`/api/v1/properties/${propertyId}`, {
    method: 'PATCH',
    body: { city: 'Homs' },
    userId: adminId,
    role: 'ADMIN',
  })

  assert.equal(response.body.data.status, 'REJECTED')
  assert.equal('status' in lastUpdateData, false)
})
