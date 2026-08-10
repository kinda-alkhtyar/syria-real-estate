import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'

import express from 'express'

process.env.CORS_ORIGINS = 'https://client.example'

const [
  { createPropertyManagementListController },
  { default: errorMiddleware },
  { requireRole },
  { createManagementRouter },
  { createPropertyManagementListService },
] = await Promise.all([
  import('../src/controllers/property-management.controller.js'),
  import('../src/middleware/error.middleware.js'),
  import('../src/middleware/authentication.middleware.js'),
  import('../src/routes/management.routes.js'),
  import('../src/services/property-management-list.service.js'),
])

const ownerId = '11111111-1111-4111-8111-111111111111'
const otherOwnerId = '22222222-2222-4222-8222-222222222222'
const adminId = '33333333-3333-4333-8333-333333333333'

function record({
  id,
  ownerId: propertyOwnerId,
  slug,
  status,
  transaction = 'BUY',
  propertyType = 'HOUSE',
  governorate = 'DAMASCUS',
  price = 100000,
  createdAt,
  updatedAt = createdAt,
}) {
  return {
    id,
    ownerId: propertyOwnerId,
    slug,
    titleEn: `${slug} English`,
    titleAr: `${slug} Arabic`,
    titleDe: `${slug} German`,
    transaction,
    propertyType,
    status,
    governorate,
    city: 'Damascus',
    district: null,
    neighborhood: null,
    address: null,
    price,
    currency: 'USD',
    bedrooms: 3,
    bathrooms: 2,
    area: 140,
    createdAt: new Date(createdAt),
    updatedAt: new Date(updatedAt),
    images: [
      {
        id: `${id.slice(0, -1)}a`,
        url: `https://images.example/${slug}.webp`,
        altEn: `${slug} thumbnail`,
        altAr: null,
        altDe: null,
        sortOrder: 0,
        width: 960,
        height: 720,
        storagePath: `private/${slug}`,
      },
    ],
    passwordHash: 'must-never-appear',
    sessions: ['must-never-appear'],
    storagePath: `private/${slug}`,
  }
}

const records = [
  record({
    id: '40000000-0000-4000-8000-000000000001',
    ownerId,
    slug: 'owner-draft',
    status: 'DRAFT',
    createdAt: '2026-01-01T00:00:00.000Z',
  }),
  record({
    id: '40000000-0000-4000-8000-000000000002',
    ownerId,
    slug: 'owner-archived',
    status: 'ARCHIVED',
    transaction: 'RENT',
    propertyType: 'APARTMENT',
    governorate: 'ALEPPO',
    price: 80000,
    createdAt: '2026-02-01T00:00:00.000Z',
  }),
  record({
    id: '40000000-0000-4000-8000-000000000003',
    ownerId: otherOwnerId,
    slug: 'other-available',
    status: 'AVAILABLE',
    transaction: 'RENT',
    propertyType: 'APARTMENT',
    governorate: 'ALEPPO',
    price: 120000,
    createdAt: '2026-03-01T00:00:00.000Z',
  }),
]

function compareBy(orderBy) {
  return (left, right) => {
    for (const order of orderBy) {
      const [field, direction] = Object.entries(order)[0]
      const leftValue = left[field]
      const rightValue = right[field]
      if (leftValue < rightValue) return direction === 'asc' ? -1 : 1
      if (leftValue > rightValue) return direction === 'asc' ? 1 : -1
    }
    return 0
  }
}

const repository = {
  async findManageableProperties({ where, orderBy, skip, take }) {
    const matching = records
      .filter((property) =>
        Object.entries(where).every(
          ([field, value]) => property[field] === value,
        ),
      )
      .sort(compareBy(orderBy))
    return {
      items: matching.slice(skip, skip + take),
      total: matching.length,
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

let baseUrl
let closeServer

before(async () => {
  const service = createPropertyManagementListService({ repository })
  const controller = createPropertyManagementListController({ service })
  const app = express()
  app.use(
    '/api/v1/management',
    createManagementRouter({
      controller,
      authenticationMiddleware: authenticate,
      roleMiddleware: requireRole('OWNER', 'ADMIN'),
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

async function request(
  query = '',
  { userId = ownerId, role = 'OWNER' } = {},
) {
  const headers = {}
  if (userId) {
    headers['X-Test-User'] = userId
    headers['X-Test-Role'] = role
  }
  const response = await fetch(
    `${baseUrl}/api/v1/management/properties${query}`,
    { headers },
  )
  return {
    status: response.status,
    body: await response.json(),
  }
}

test('returns structured 401 unauthenticated and 403 for USER', async () => {
  const unauthenticated = await request('', { userId: null })
  const user = await request('', { role: 'USER' })

  assert.equal(unauthenticated.status, 401)
  assert.equal(
    unauthenticated.body.error.code,
    'AUTHENTICATION_REQUIRED',
  )
  assert.equal(user.status, 403)
  assert.equal(user.body.error.code, 'FORBIDDEN')
})

test('OWNER receives only owned properties including draft and archived', async () => {
  const response = await request('?sort=oldest')

  assert.equal(response.status, 200)
  assert.deepEqual(
    response.body.data.map(({ slug }) => slug),
    ['owner-draft', 'owner-archived'],
  )
  assert.deepEqual(
    response.body.data.map(({ status }) => status),
    ['DRAFT', 'ARCHIVED'],
  )
})

test('ADMIN receives every manageable property', async () => {
  const response = await request('?sort=oldest', {
    userId: adminId,
    role: 'ADMIN',
  })

  assert.equal(response.status, 200)
  assert.equal(response.body.data.length, 3)
  assert.equal(response.body.meta.total, 3)
})

test('supports filtering, deterministic sorting, and pagination', async () => {
  const filtered = await request('?status=archived')
  const paged = await request(
    '?transactionType=rent&propertyType=apartment&governorate=aleppo' +
      '&sort=price-desc&page=2&pageSize=1',
    { userId: adminId, role: 'ADMIN' },
  )

  assert.equal(filtered.status, 200)
  assert.deepEqual(
    filtered.body.data.map(({ slug }) => slug),
    ['owner-archived'],
  )
  assert.equal(paged.status, 200)
  assert.deepEqual(
    paged.body.data.map(({ slug }) => slug),
    ['owner-archived'],
  )
  assert.deepEqual(paged.body.meta, {
    page: 2,
    pageSize: 1,
    total: 2,
    totalPages: 2,
  })
})

test('returns only dashboard-safe property and image fields', async () => {
  const response = await request('?pageSize=1&sort=oldest')
  const serialized = JSON.stringify(response.body)
  const property = response.body.data[0]

  assert.deepEqual(Object.keys(property), [
    'id',
    'slug',
    'titleEn',
    'titleAr',
    'titleDe',
    'transaction',
    'propertyType',
    'status',
    'governorate',
    'city',
    'district',
    'neighborhood',
    'address',
    'price',
    'currency',
    'bedrooms',
    'bathrooms',
    'area',
    // Exposed to the dashboard on purpose: the edit form pre-fills it.
    'whatsapp',
    'videoUrl',
    'videoMimeType',
    'videoSizeBytes',
    'createdAt',
    'updatedAt',
    'images',
  ])
  for (const privateField of [
    'ownerId',
    'passwordHash',
    'sessions',
    'storagePath',
  ]) {
    assert.ok(!serialized.includes(privateField))
  }
})

test('rejects invalid and ownership-related query parameters', async () => {
  const invalid = await request('?page=0')
  const ownership = await request(`?ownerId=${otherOwnerId}`)

  assert.equal(invalid.status, 400)
  assert.equal(invalid.body.error.code, 'INVALID_REQUEST')
  assert.equal(ownership.status, 400)
  assert.equal(ownership.body.error.code, 'INVALID_REQUEST')
})
