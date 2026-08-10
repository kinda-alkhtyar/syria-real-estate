import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'

import express from 'express'

process.env.CORS_ORIGINS = 'https://client.example'

const [
  { createPropertyRouter },
  { requireRole },
  { createPropertyImageUploadMiddleware },
  { default: errorMiddleware },
] = await Promise.all([
  import('../src/routes/property.routes.js'),
  import('../src/middleware/authentication.middleware.js'),
  import('../src/middleware/property-image-upload.middleware.js'),
  import('../src/middleware/error.middleware.js'),
])

const ownerId = '11111111-1111-4111-8111-111111111111'
const otherOwnerId = '22222222-2222-4222-8222-222222222222'
const adminId = '33333333-3333-4333-8333-333333333333'
const propertyId = '44444444-4444-4444-8444-444444444444'
const missingPropertyId = '55555555-5555-4555-8555-555555555555'
const imageId = '66666666-6666-4666-8666-666666666666'
const allowedOrigin = 'https://client.example'
const calls = { deletes: [] }

const safeImage = {
  id: imageId,
  url: 'https://public.example/image.webp',
  altEn: 'A property',
  altAr: null,
  altDe: null,
  sortOrder: 0,
  mimeType: 'image/webp',
  sizeBytes: 100,
  width: 20,
  height: 10,
  createdAt: '2026-07-26T00:00:00.000Z',
}

const imageService = {
  async authorizeProperty(id, actor) {
    if (id === missingPropertyId) {
      const error = new Error('The requested property was not found.')
      error.code = 'PROPERTY_NOT_FOUND'
      error.statusCode = 404
      throw error
    }
    if (actor.role !== 'ADMIN' && actor.id !== ownerId) {
      const error = new Error('You are not allowed to manage this property.')
      error.code = 'FORBIDDEN'
      error.statusCode = 403
      throw error
    }
  },
  async uploadImage() {
    return safeImage
  },
  async reorderImages(_id, imageIds) {
    return imageIds.map((id, sortOrder) => ({
      ...safeImage,
      id,
      sortOrder,
    }))
  },
  async setPrimaryImage() {
    return [safeImage]
  },
  async deleteImage(id, idOfImage) {
    calls.deletes.push({ id, idOfImage })
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
  request.auth = { user: { id, role, name: 'Test user' } }
  next()
}

let baseUrl
let closeServer

before(async () => {
  const app = express()
  app.use(express.json())
  app.use(
    '/api/v1/properties',
    createPropertyRouter({
      imageService,
      imageUploadMiddleware: createPropertyImageUploadMiddleware(),
      authenticationMiddleware: authenticate,
      roleMiddleware: requireRole('OWNER', 'ADMIN'),
      originMiddleware: (_request, _response, next) => next(),
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

function multipart({ unknown = false, multiple = false } = {}) {
  const body = new FormData()
  body.append(
    'image',
    new Blob([Buffer.from([0xff, 0xd8, 0xff])], {
      type: 'image/jpeg',
    }),
    'untrusted-name.jpg',
  )
  if (multiple) {
    body.append(
      'image',
      new Blob([Buffer.from([0xff, 0xd8, 0xff])], {
        type: 'image/jpeg',
      }),
      'second.jpg',
    )
  }
  if (unknown) body.append('ownerId', otherOwnerId)
  return body
}

async function request(
  path,
  {
    method = 'POST',
    body,
    userId = ownerId,
    role = 'OWNER',
    contentType,
  } = {},
) {
  const headers = { Origin: allowedOrigin }
  if (userId) {
    headers['X-Test-User'] = userId
    headers['X-Test-Role'] = role
  }
  if (contentType) headers['Content-Type'] = contentType
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body:
      body instanceof FormData || typeof body === 'string'
        ? body
        : body === undefined
          ? undefined
          : JSON.stringify(body),
  })
  const text = await response.text()
  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
  }
}

test('returns 401 unauthenticated and 403 for USER role', async () => {
  const unauthenticated = await request(
    `/api/v1/properties/${propertyId}/images`,
    { body: multipart(), userId: null },
  )
  const user = await request(`/api/v1/properties/${propertyId}/images`, {
    body: multipart(),
    role: 'USER',
  })
  assert.equal(unauthenticated.status, 401)
  assert.equal(user.status, 403)
})

test('OWNER uploads for owned property and response excludes private fields', async () => {
  const response = await request(
    `/api/v1/properties/${propertyId}/images`,
    { body: multipart() },
  )
  assert.equal(response.status, 201)
  assert.deepEqual(response.body, { data: safeImage })
  for (const field of ['storagePath', 'ownerId', 'tokenHash', 'passwordHash']) {
    assert.ok(!JSON.stringify(response.body).includes(field))
  }
})

test('non-owner is denied while ADMIN is allowed', async () => {
  const denied = await request(`/api/v1/properties/${propertyId}/images`, {
    body: multipart(),
    userId: otherOwnerId,
  })
  const admin = await request(`/api/v1/properties/${propertyId}/images`, {
    body: multipart(),
    userId: adminId,
    role: 'ADMIN',
  })
  assert.equal(denied.status, 403)
  assert.equal(admin.status, 201)
})

test('missing property returns structured 404 before multipart parsing', async () => {
  const response = await request(
    `/api/v1/properties/${missingPropertyId}/images`,
    { body: 'not multipart', contentType: 'text/plain' },
  )
  assert.equal(response.status, 404)
  assert.equal(response.body.error.code, 'PROPERTY_NOT_FOUND')
})

test('rejects malformed multipart, unknown fields, and multiple files', async () => {
  const malformed = await request(
    `/api/v1/properties/${propertyId}/images`,
    {
      body: 'invalid multipart',
      contentType: 'multipart/form-data; boundary=missing',
    },
  )
  const unknown = await request(`/api/v1/properties/${propertyId}/images`, {
    body: multipart({ unknown: true }),
  })
  const multiple = await request(`/api/v1/properties/${propertyId}/images`, {
    body: multipart({ multiple: true }),
  })

  assert.equal(malformed.status, 400)
  assert.equal(unknown.status, 400)
  assert.equal(multiple.status, 400)
})

test('validates reorder payloads and supports primary and targeted delete', async () => {
  const invalidOrder = await request(
    `/api/v1/properties/${propertyId}/images/order`,
    {
      method: 'PATCH',
      body: { imageIds: [imageId, imageId] },
      contentType: 'application/json',
    },
  )
  const primary = await request(
    `/api/v1/properties/${propertyId}/images/${imageId}/primary`,
    { method: 'PATCH' },
  )
  const removed = await request(
    `/api/v1/properties/${propertyId}/images/${imageId}`,
    { method: 'DELETE' },
  )

  assert.equal(invalidOrder.status, 400)
  assert.equal(primary.status, 200)
  assert.equal(primary.body.data[0].sortOrder, 0)
  assert.equal(removed.status, 204)
  assert.deepEqual(calls.deletes.at(-1), {
    id: propertyId,
    idOfImage: imageId,
  })
})
