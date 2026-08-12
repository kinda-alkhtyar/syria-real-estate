import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'

import express from 'express'

process.env.CORS_ORIGINS = 'https://client.example'

const [
  { createManagementRouter },
  { createPropertyManagementController },
  { createPropertyManagementService },
  { requireRole },
  { default: errorMiddleware },
] = await Promise.all([
  import('../src/routes/management.routes.js'),
  import('../src/controllers/property.controller.js'),
  import('../src/services/property.service.js'),
  import('../src/middleware/authentication.middleware.js'),
  import('../src/middleware/error.middleware.js'),
])

const ownerId = '11111111-1111-4111-8111-111111111111'
const otherOwnerId = '22222222-2222-4222-8222-222222222222'
const adminId = '33333333-3333-4333-8333-333333333333'
const propertyId = '44444444-4444-4444-8444-444444444444'
const missingPropertyId = '55555555-5555-4555-8555-555555555555'
const allowedOrigin = 'https://client.example'

let properties
let images
let removedStoragePaths
let removedVideoPaths
let storageFailure
let videoStorageFailure

const videoStoragePath = `properties/${propertyId}/tour.mp4`

function seed({
  ownerIdValue = ownerId,
  status = 'DRAFT',
  video = videoStoragePath,
} = {}) {
  properties.set(propertyId, {
    id: propertyId,
    slug: 'listing-to-delete',
    ownerId: ownerIdValue,
    status,
    videoStoragePath: video,
  })
  images.set(propertyId, [
    { id: 'image-1', propertyId, storagePath: `properties/${propertyId}/a.webp` },
    { id: 'image-2', propertyId, storagePath: `properties/${propertyId}/b.webp` },
    // A legacy row with no storage object: it must still disappear with the
    // listing, and must not be sent to storage as an empty path.
    { id: 'image-3', propertyId, storagePath: null },
  ])
}

/**
 * Stands in for Prisma. `deleteProperty` reproduces what the real repository
 * relies on: the PropertyImage rows go with the listing through the FK cascade
 * rather than being deleted one by one.
 */
const repository = {
  async findPropertyOwnership(id) {
    const record = properties.get(id)
    return record
      ? { id: record.id, ownerId: record.ownerId, status: record.status }
      : null
  },
  async deleteProperty(id) {
    const rows = images.get(id) ?? []
    const record = properties.get(id)
    properties.delete(id)
    images.delete(id)
    return {
      imageStoragePaths: rows
        .map(({ storagePath }) => storagePath)
        .filter(Boolean),
      videoStoragePath: record?.videoStoragePath ?? null,
    }
  },
}

const storage = {
  async remove(storagePath) {
    if (storageFailure) {
      const error = new Error('The image storage operation failed.')
      error.code = 'STORAGE_OPERATION_FAILED'
      throw error
    }
    removedStoragePaths.push(storagePath)
  },
}

// The video lives in its own bucket, so it is a separate adapter and a separate
// spy: a test that asserts one must not be satisfied by the other.
const videoStorage = {
  async remove(storagePath) {
    if (videoStorageFailure) {
      const error = new Error('The image storage operation failed.')
      error.code = 'STORAGE_OPERATION_FAILED'
      throw error
    }
    removedVideoPaths.push(storagePath)
  },
}

const silentLog = { error() {}, info() {}, warn() {} }

function authenticate(request, _response, next) {
  const id = request.get('X-Test-User')
  const role = request.get('X-Test-Role')
  if (!id || !role) {
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
let baseUrl
let closeServer

before(async () => {
  const controller = createPropertyManagementController({
    service: createPropertyManagementService({
      log: silentLog,
      repository,
      storage,
      videoStorage,
    }),
  })
  const app = express()
  app.use(express.json())
  app.use(
    '/api/v1/management',
    createManagementRouter({
      moderationController: controller,
      authenticationMiddleware: authenticate,
      roleMiddleware: requireRole('OWNER', 'ADMIN'),
      moderationRoleMiddleware: requireRole('ADMIN'),
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
  properties = new Map()
  images = new Map()
  removedStoragePaths = []
  removedVideoPaths = []
  storageFailure = false
  videoStorageFailure = false
})

async function deleteProperty(
  id = propertyId,
  { userId = ownerId, role = 'OWNER' } = {},
) {
  const headers = { Origin: allowedOrigin }
  if (userId) {
    headers['X-Test-User'] = userId
    headers['X-Test-Role'] = role
  }
  const response = await fetch(
    `${baseUrl}/api/v1/management/properties/${id}`,
    { method: 'DELETE', headers },
  )
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}

test('an owner deletes their own listing at every status', async () => {
  for (const status of [
    'DRAFT',
    'PENDING_REVIEW',
    'AVAILABLE',
    'RESERVED',
    'SOLD',
    'RENTED',
    'REJECTED',
    'ARCHIVED',
  ]) {
    seed({ status })
    const response = await deleteProperty()

    assert.equal(response.status, 200, `status ${status} was refused`)
    assert.equal(response.body.data.id, propertyId)
    assert.equal(properties.has(propertyId), false)
  }
})

test('the image rows go with the listing and every object is removed', async () => {
  seed({ status: 'AVAILABLE' })
  const response = await deleteProperty()

  assert.equal(response.status, 200)
  // Nothing deletes these by hand: they are gone because the listing is.
  assert.equal(images.has(propertyId), false)
  assert.deepEqual(removedStoragePaths, [
    `properties/${propertyId}/a.webp`,
    `properties/${propertyId}/b.webp`,
  ])
  // The video is stored in its own bucket and cleaned up alongside them.
  assert.deepEqual(removedVideoPaths, [videoStoragePath])
})

test('a listing without a video asks the video bucket for nothing', async () => {
  seed({ status: 'AVAILABLE', video: null })
  const response = await deleteProperty()

  assert.equal(response.status, 200)
  assert.deepEqual(removedVideoPaths, [])
  assert.equal(removedStoragePaths.length, 2)
})

test('a failed image cleanup never fails the delete or skips the video', async () => {
  seed({ status: 'AVAILABLE' })
  storageFailure = true
  const response = await deleteProperty()

  assert.equal(response.status, 200)
  assert.equal(properties.has(propertyId), false)
  // Each object is attempted on its own, so unreachable images do not take the
  // video cleanup down with them.
  assert.deepEqual(removedVideoPaths, [videoStoragePath])
})

test('a failed video cleanup never fails the delete', async () => {
  seed({ status: 'AVAILABLE' })
  videoStorageFailure = true
  const response = await deleteProperty()

  assert.equal(response.status, 200)
  assert.equal(properties.has(propertyId), false)
  assert.equal(removedStoragePaths.length, 2)
})

test('both storages failing still leaves the listing deleted', async () => {
  seed({ status: 'AVAILABLE' })
  storageFailure = true
  videoStorageFailure = true
  const response = await deleteProperty()

  assert.equal(response.status, 200)
  assert.equal(response.body.data.id, propertyId)
  assert.equal(properties.has(propertyId), false)
})

test('another owner cannot delete a listing that is not theirs', async () => {
  seed({ ownerIdValue: otherOwnerId, status: 'AVAILABLE' })
  const response = await deleteProperty()

  assert.equal(response.status, 403)
  assert.equal(response.body.error.code, 'FORBIDDEN')
  assert.equal(properties.has(propertyId), true)
  assert.deepEqual(removedStoragePaths, [])
  assert.deepEqual(removedVideoPaths, [])
})

test('a failed cleanup is logged for the object that failed', async () => {
  const entries = []
  const service = createPropertyManagementService({
    log: { error: (event, fields) => entries.push({ event, fields }) },
    repository,
    storage,
    videoStorage,
  })

  seed({ status: 'AVAILABLE' })
  storageFailure = true
  videoStorageFailure = true
  const deleted = await service.deleteProperty(propertyId, {
    id: ownerId,
    role: 'OWNER',
  })

  assert.deepEqual(deleted, { id: propertyId })
  assert.equal(entries.length, 3)
  assert.deepEqual(
    entries.map(({ fields }) => fields.category),
    ['image', 'image', 'video'],
  )
  for (const { event, fields } of entries) {
    assert.equal(event, 'property_media_cleanup_failed')
    assert.equal(fields.code, 'STORAGE_OPERATION_FAILED')
  }
})

test('an anonymous caller is refused before anything is read', async () => {
  seed({ status: 'AVAILABLE' })
  const response = await deleteProperty(propertyId, { userId: null })

  assert.equal(response.status, 401)
  assert.equal(response.body.error.code, 'AUTHENTICATION_REQUIRED')
  assert.equal(properties.has(propertyId), true)
})

test('a signed-in visitor without a management role is refused', async () => {
  seed({ status: 'AVAILABLE' })
  const response = await deleteProperty(propertyId, { role: 'USER' })

  assert.equal(response.status, 403)
  assert.equal(properties.has(propertyId), true)
})

test('an administrator deletes any listing', async () => {
  seed({ ownerIdValue: otherOwnerId, status: 'AVAILABLE' })
  const response = await deleteProperty(propertyId, {
    userId: adminId,
    role: 'ADMIN',
  })

  assert.equal(response.status, 200)
  assert.equal(properties.has(propertyId), false)
})

test('deleting a missing or malformed id is a structured error', async () => {
  const missing = await deleteProperty(missingPropertyId)
  const malformed = await deleteProperty('not-a-uuid')

  assert.equal(missing.status, 404)
  assert.equal(missing.body.error.code, 'PROPERTY_NOT_FOUND')
  assert.equal(malformed.status, 400)
  assert.equal(malformed.body.error.code, 'INVALID_REQUEST')
})

// The public detail route resolves a slug through the same table; once the row
// is gone there is nothing left for it to resolve, which is what turns a public
// read of a deleted listing into a 404. Asserted here through the store the
// public select reads from, and through a second delete, which is the one
// route-level lookup that observes the row is gone.
test('a deleted listing is not found by any later lookup', async () => {
  seed({ status: 'AVAILABLE' })
  const deleted = await deleteProperty()
  const repeated = await deleteProperty()

  assert.equal(deleted.status, 200)
  assert.equal(repeated.status, 404)
  assert.equal(repeated.body.error.code, 'PROPERTY_NOT_FOUND')
  assert.equal(
    [...properties.values()].some(({ slug }) => slug === 'listing-to-delete'),
    false,
  )
})
