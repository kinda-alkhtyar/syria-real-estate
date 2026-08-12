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
  { propertyQuerySchema, publicPropertyStatuses },
] = await Promise.all([
  import('../src/routes/management.routes.js'),
  import('../src/controllers/property.controller.js'),
  import('../src/services/property.service.js'),
  import('../src/middleware/authentication.middleware.js'),
  import('../src/middleware/error.middleware.js'),
  import('../src/validation/property.schema.js'),
])

const ownerId = '11111111-1111-4111-8111-111111111111'
const adminId = '33333333-3333-4333-8333-333333333333'
const propertyId = '44444444-4444-4444-8444-444444444444'
const missingPropertyId = '55555555-5555-4555-8555-555555555555'
const allowedOrigin = 'https://client.example'

let records

function seed({ status = 'PENDING_REVIEW', rejectionReason = null } = {}) {
  records.set(propertyId, {
    id: propertyId,
    slug: 'listing-under-review',
    ownerId,
    status,
    rejectionReason,
  })
}

const repository = {
  async findPropertyOwnership(id) {
    const record = records.get(id)
    return record
      ? { id: record.id, ownerId: record.ownerId, status: record.status }
      : null
  },
  async updatePropertyModeration(id, data) {
    const record = { ...records.get(id), ...data }
    records.set(id, record)
    return {
      id: record.id,
      slug: record.slug,
      status: record.status,
      rejectionReason: record.rejectionReason,
    }
  },
}

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
  const moderationController = createPropertyManagementController({
    service: createPropertyManagementService({ repository }),
  })
  const app = express()
  app.use(express.json())
  app.use(
    '/api/v1/management',
    createManagementRouter({
      moderationController,
      authenticationMiddleware: authenticate,
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
  records = new Map()
})

async function moderate(
  path,
  { body, userId = adminId, role = 'ADMIN' } = {},
) {
  const headers = {
    'Content-Type': 'application/json',
    Origin: allowedOrigin,
  }
  if (userId) {
    headers['X-Test-User'] = userId
    headers['X-Test-Role'] = role
  }
  const response = await fetch(`${baseUrl}/api/v1/management/properties${path}`, {
    method: 'POST',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}

test('approving a submission publishes it', async () => {
  seed()
  const response = await moderate(`/${propertyId}/approve`)

  assert.equal(response.status, 200)
  assert.equal(response.body.data.status, 'AVAILABLE')
  assert.equal(response.body.data.rejectionReason, null)
  assert.equal(records.get(propertyId).status, 'AVAILABLE')
})

test('approving clears a reason left by an earlier rejection', async () => {
  seed({ status: 'REJECTED', rejectionReason: 'Photographs were unclear.' })
  const response = await moderate(`/${propertyId}/approve`)

  assert.equal(response.body.data.status, 'AVAILABLE')
  assert.equal(records.get(propertyId).rejectionReason, null)
})

test('rejecting stores the moderator reason', async () => {
  seed()
  const reason = 'The photographs do not show the advertised property.'
  const response = await moderate(`/${propertyId}/reject`, {
    body: { reason },
  })

  assert.equal(response.status, 200)
  assert.equal(response.body.data.status, 'REJECTED')
  assert.equal(response.body.data.rejectionReason, reason)
  assert.equal(records.get(propertyId).rejectionReason, reason)
})

test('a rejection reason is required, bounded, and plain text', async () => {
  seed()
  const missing = await moderate(`/${propertyId}/reject`, { body: {} })
  const empty = await moderate(`/${propertyId}/reject`, {
    body: { reason: '   ' },
  })
  const tooLong = await moderate(`/${propertyId}/reject`, {
    body: { reason: 'x'.repeat(501) },
  })
  const html = await moderate(`/${propertyId}/reject`, {
    body: { reason: '<script>alert(1)</script>' },
  })
  const unknownField = await moderate(`/${propertyId}/reject`, {
    body: { reason: 'Fine', notify: true },
  })

  for (const response of [missing, empty, tooLong, html, unknownField]) {
    assert.equal(response.status, 400)
    assert.equal(response.body.error.code, 'INVALID_REQUEST')
  }
  // A refused rejection leaves the listing exactly as it was.
  assert.equal(records.get(propertyId).status, 'PENDING_REVIEW')
})

test('moderation is administrator-only', async () => {
  seed()
  const unauthenticated = await moderate(`/${propertyId}/approve`, {
    userId: null,
  })
  const owner = await moderate(`/${propertyId}/approve`, {
    userId: ownerId,
    role: 'OWNER',
  })
  const rejectedByOwner = await moderate(`/${propertyId}/reject`, {
    body: { reason: 'Not mine to judge.' },
    userId: ownerId,
    role: 'OWNER',
  })

  assert.equal(unauthenticated.status, 401)
  assert.equal(unauthenticated.body.error.code, 'AUTHENTICATION_REQUIRED')
  assert.equal(owner.status, 403)
  assert.equal(owner.body.error.code, 'FORBIDDEN')
  assert.equal(rejectedByOwner.status, 403)
  assert.equal(records.get(propertyId).status, 'PENDING_REVIEW')
})

test('moderating a missing or malformed id is a structured error', async () => {
  const missing = await moderate(`/${missingPropertyId}/approve`)
  const malformed = await moderate('/not-a-uuid/approve')

  assert.equal(missing.status, 404)
  assert.equal(missing.body.error.code, 'PROPERTY_NOT_FOUND')
  assert.equal(malformed.status, 400)
  assert.equal(malformed.body.error.code, 'INVALID_REQUEST')
})

// Public reads intersect the requested status with this set, so keeping both
// moderation states out of it is what keeps an unapproved listing invisible on
// the list and on the detail route.
test('the public status set excludes listings under moderation', () => {
  assert.deepEqual(publicPropertyStatuses, [
    'AVAILABLE',
    'RESERVED',
    'SOLD',
    'RENTED',
  ])
  assert.ok(!publicPropertyStatuses.includes('PENDING_REVIEW'))
  assert.ok(!publicPropertyStatuses.includes('REJECTED'))
})

test('a visitor cannot ask for a moderation status', () => {
  for (const status of ['pending_review', 'rejected', 'draft']) {
    assert.equal(propertyQuerySchema.safeParse({ status }).success, false)
  }
  assert.equal(
    propertyQuerySchema.safeParse({ status: 'available' }).success,
    true,
  )
})
