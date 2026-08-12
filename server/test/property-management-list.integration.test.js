import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
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
  rejectionReason = null,
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
    descriptionEn: `${slug} English description`,
    descriptionAr: `${slug} Arabic description`,
    descriptionDe: null,
    transaction,
    propertyType,
    status,
    rejectionReason,
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
    id: '40000000-0000-4000-8000-000000000004',
    ownerId,
    slug: 'owner-pending',
    status: 'PENDING_REVIEW',
    createdAt: '2026-01-15T00:00:00.000Z',
  }),
  record({
    id: '40000000-0000-4000-8000-000000000005',
    ownerId,
    slug: 'owner-rejected',
    status: 'REJECTED',
    rejectionReason: 'The photographs do not show the advertised property.',
    createdAt: '2026-01-20T00:00:00.000Z',
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
    headers: response.headers,
    body: await response.json(),
  }
}

test('never lets a shared cache keep a dashboard response', async () => {
  const response = await request()

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  // Caches that ignore no-store must at least key on the session cookie.
  assert.match(response.headers.get('vary') ?? '', /Cookie/i)
})

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
    ['owner-draft', 'owner-pending', 'owner-rejected', 'owner-archived'],
  )
  assert.deepEqual(
    response.body.data.map(({ status }) => status),
    ['DRAFT', 'PENDING_REVIEW', 'REJECTED', 'ARCHIVED'],
  )
})

test('an owner sees the moderator note on a rejected listing only', async () => {
  const response = await request('?sort=oldest')
  const byStatus = Object.fromEntries(
    response.body.data.map((property) => [
      property.status,
      property.rejectionReason,
    ]),
  )

  assert.equal(
    byStatus.REJECTED,
    'The photographs do not show the advertised property.',
  )
  assert.equal(byStatus.PENDING_REVIEW, null)
  assert.equal(byStatus.DRAFT, null)
})

// The dashboard badge is the paginated total, so it has to be right even when
// the caller asks for a single page of the queue.
test('the review queue is filterable and its total drives the badge', async () => {
  const queue = await request('?status=pending_review&pageSize=1', {
    userId: adminId,
    role: 'ADMIN',
  })

  assert.equal(queue.status, 200)
  assert.deepEqual(
    queue.body.data.map(({ slug }) => slug),
    ['owner-pending'],
  )
  assert.equal(queue.body.meta.total, 1)
  assert.equal(queue.body.meta.totalPages, 1)
})

test('an owner queue is scoped to that owner', async () => {
  const owned = await request('?status=pending_review')
  const other = await request('?status=pending_review', {
    userId: otherOwnerId,
  })

  assert.equal(owned.body.meta.total, 1)
  assert.equal(other.body.meta.total, 0)
})

test('ADMIN receives every manageable property', async () => {
  const response = await request('?sort=oldest', {
    userId: adminId,
    role: 'ADMIN',
  })

  assert.equal(response.status, 200)
  assert.equal(response.body.data.length, 5)
  assert.equal(response.body.meta.total, 5)
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
    // Exposed to the dashboard on purpose: the edit form pre-fills the
    // description of the language being written.
    'descriptionEn',
    'descriptionAr',
    'descriptionDe',
    'transaction',
    'propertyType',
    'status',
    // Read by the dashboard next to the status so a rejected owner is told
    // what to change.
    'rejectionReason',
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
  // The stored descriptions travel as written, with an unwritten one as null.
  assert.equal(property.descriptionEn, 'owner-draft English description')
  assert.equal(property.descriptionAr, 'owner-draft Arabic description')
  assert.equal(property.descriptionDe, null)
})

// The select is private to the repository and bound to the Prisma singleton, so
// the column list is asserted at the source: a serializer that reads a column
// the query never selected would silently return undefined.
test('selects the stored descriptions for the management list', () => {
  const source = readFileSync(
    new URL('../src/repositories/property.repository.js', import.meta.url),
    'utf8',
  )
  const select = source.slice(
    source.indexOf('const managementPropertySelect'),
    source.indexOf('const propertyVideoSelect'),
  )

  for (const column of [
    'descriptionEn',
    'descriptionAr',
    'descriptionDe',
    'status',
    'rejectionReason',
  ]) {
    assert.match(select, new RegExp(`\\b${column}: true`))
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
