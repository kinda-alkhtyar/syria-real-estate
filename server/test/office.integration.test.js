import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'

import express from 'express'

process.env.CORS_ORIGINS = 'https://client.example'

const [
  { createOfficeRouter },
  { createOfficeService },
  { requireRole },
  { default: errorMiddleware },
] = await Promise.all([
  import('../src/routes/office.routes.js'),
  import('../src/services/office.service.js'),
  import('../src/middleware/authentication.middleware.js'),
  import('../src/middleware/error.middleware.js'),
])

const ownerId = '11111111-1111-4111-8111-111111111111'
const otherOwnerId = '22222222-2222-4222-8222-222222222222'
const adminId = '33333333-3333-4333-8333-333333333333'
const allowedOrigin = 'https://client.example'

const damascusOfficeId = 'coffice00000000000000001'
const aleppoOfficeId = 'coffice00000000000000002'
const unknownOfficeId = 'coffice00000000000000009'

const validOffice = {
  nameAr: 'مكتب الشام العقاري',
  nameEn: 'Damascus Real Estate Office',
  nameDe: 'Immobilienbüro Damaskus',
  governorate: 'damascus',
}

let offices
let properties
let nextOfficeId

function officeRecord(data) {
  return {
    id: data.id,
    ownerId: data.ownerId,
    nameAr: data.nameAr,
    nameEn: data.nameEn,
    nameDe: data.nameDe,
    descriptionAr: data.descriptionAr ?? null,
    descriptionEn: data.descriptionEn ?? null,
    descriptionDe: data.descriptionDe ?? null,
    governorate: data.governorate,
    city: data.city ?? null,
    phone: data.phone ?? null,
    whatsapp: data.whatsapp ?? null,
    logoUrl: data.logoUrl ?? null,
    createdAt: data.createdAt ?? new Date('2026-08-01T10:00:00.000Z'),
    updatedAt: new Date('2026-08-01T10:00:00.000Z'),
  }
}

function propertyRecord(data) {
  return {
    id: data.id,
    slug: data.slug,
    officeId: data.officeId ?? null,
    ownerId: data.ownerId ?? ownerId,
    titleEn: data.slug,
    titleAr: data.slug,
    titleDe: data.slug,
    transaction: 'BUY',
    propertyType: 'HOUSE',
    status: data.status,
    price: 100000,
    currency: 'USD',
    governorate: 'DAMASCUS',
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
    createdAt: data.createdAt,
    updatedAt: data.createdAt,
    images: [],
  }
}

const publicStatuses = new Set(['AVAILABLE', 'RESERVED', 'SOLD', 'RENTED'])

function publicPropertyCount(officeId) {
  return [...properties.values()].filter(
    (record) =>
      record.officeId === officeId && publicStatuses.has(record.status),
  ).length
}

// The repository's `select` decides what a caller sees, so the mocks reproduce
// it: the list omits the description columns, and both shapes carry the
// filtered `_count.properties` the real query computes.
function withCount(record) {
  return { ...record, _count: { properties: publicPropertyCount(record.id) } }
}

function asListRow(record) {
  const row = withCount(record)
  delete row.descriptionAr
  delete row.descriptionEn
  delete row.descriptionDe
  return row
}

function createMockOfficeRepository() {
  return {
    async createOffice(data) {
      if ([...offices.values()].some((row) => row.ownerId === data.ownerId)) {
        const error = new Error('Unique constraint')
        error.code = 'P2002'
        error.meta = { target: ['ownerId'] }
        throw error
      }
      const record = officeRecord({ ...data, id: `coffice0000000000000000${nextOfficeId++}` })
      offices.set(record.id, record)
      // Mirrors the repository transaction: the new office adopts every listing
      // its owner already has that is not attached elsewhere.
      for (const property of properties.values()) {
        if (property.ownerId === data.ownerId && property.officeId === null) {
          property.officeId = record.id
        }
      }
      return withCount(record)
    },

    async findOfficeByOwnerId(ownerId) {
      const record = [...offices.values()].find(
        (row) => row.ownerId === ownerId,
      )
      return record ? withCount(record) : null
    },

    async findOfficeOwnership(id) {
      const record = offices.get(id)
      return record ? { id: record.id, ownerId: record.ownerId } : null
    },

    async findOfficeById(id) {
      const record = offices.get(id)
      return record ? withCount(record) : null
    },

    async updateOffice(id, data) {
      const record = officeRecord({ ...offices.get(id), ...data, id })
      offices.set(id, record)
      return withCount(record)
    },

    // Mirrors `onDelete: SetNull` on Property.officeId: the office row goes,
    // and the database — not this service — unlinks the listings that pointed
    // at it. They keep their status and stay in the public tables.
    async deleteOffice(id) {
      offices.delete(id)
      for (const property of properties.values()) {
        if (property.officeId === id) property.officeId = null
      }
      return { id }
    },

    async findOffices({ where, skip, take }) {
      const matched = [...offices.values()]
        .filter(
          (record) =>
            !where.governorate || record.governorate === where.governorate,
        )
        .sort(
          (a, b) =>
            b.createdAt - a.createdAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
        )

      return {
        items: matched.slice(skip, skip + take).map(asListRow),
        total: matched.length,
      }
    },
  }
}

const mockPropertyRepository = {
  async findProperties({ where, skip, take }) {
    const allowed = new Set(where.status.in)
    const matched = [...properties.values()]
      .filter(
        (record) =>
          record.officeId === where.officeId && allowed.has(record.status),
      )
      .sort((a, b) => b.createdAt - a.createdAt)

    return {
      items: matched.slice(skip, skip + take),
      total: matched.length,
    }
  },
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
// The public read cache is exercised by its own suite; here it would serve one
// test's records to the next, so this router runs without it.
const noReadCache = (_request, _response, next) => next()

let baseUrl
let closeServer

before(async () => {
  const app = express()
  app.use(express.json())
  app.use(
    '/api/v1/offices',
    createOfficeRouter({
      service: createOfficeService({
        repository: createMockOfficeRepository(),
        propertyRepository: mockPropertyRepository,
      }),
      authenticationMiddleware: authenticate,
      roleMiddleware: requireRole('OWNER', 'ADMIN'),
      originMiddleware: trustOrigin,
      readCacheMiddleware: noReadCache,
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
  offices = new Map()
  properties = new Map()
  nextOfficeId = 3
})

async function request(
  path,
  { method = 'GET', body, userId, role = 'OWNER' } = {},
) {
  const headers = { 'Content-Type': 'application/json', Origin: allowedOrigin }
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
  return { status: response.status, body: text ? JSON.parse(text) : null }
}

function seedOffices() {
  offices.set(
    damascusOfficeId,
    officeRecord({
      ...validOffice,
      id: damascusOfficeId,
      ownerId,
      governorate: 'DAMASCUS',
      city: 'Damascus',
      descriptionAr: 'وصف',
      createdAt: new Date('2026-08-01T10:00:00.000Z'),
    }),
  )
  offices.set(
    aleppoOfficeId,
    officeRecord({
      id: aleppoOfficeId,
      ownerId: otherOwnerId,
      nameAr: 'مكتب حلب',
      nameEn: 'Aleppo Office',
      nameDe: 'Büro Aleppo',
      governorate: 'ALEPPO',
      createdAt: new Date('2026-08-05T10:00:00.000Z'),
    }),
  )
}

function seedOfficeProperties() {
  const rows = [
    { slug: 'office-listing-a', status: 'AVAILABLE', day: 3 },
    { slug: 'office-listing-b', status: 'RENTED', day: 2 },
    { slug: 'office-listing-c', status: 'DRAFT', day: 1 },
    { slug: 'office-listing-d', status: 'ARCHIVED', day: 4 },
  ]
  for (const [index, row] of rows.entries()) {
    const record = propertyRecord({
      id: `property-${index}`,
      slug: row.slug,
      officeId: damascusOfficeId,
      status: row.status,
      createdAt: new Date(`2026-08-0${row.day}T10:00:00.000Z`),
    })
    properties.set(record.id, record)
  }
}

test('anonymous and non-manager callers cannot create an office', async () => {
  const anonymous = await request('/api/v1/offices', {
    method: 'POST',
    body: validOffice,
  })
  const wrongRole = await request('/api/v1/offices', {
    method: 'POST',
    body: validOffice,
    userId: ownerId,
    role: 'USER',
  })

  assert.equal(anonymous.status, 401)
  assert.equal(wrongRole.status, 403)
  assert.equal(offices.size, 0)
})

test('owner creates an office attached to the authenticated user', async () => {
  const response = await request('/api/v1/offices', {
    method: 'POST',
    body: {
      ...validOffice,
      city: 'Damascus',
      phone: '+963 11 555 0100',
      whatsapp: '(0963) 999-888-777',
      logoUrl: 'https://cdn.example/logo.png',
      descriptionEn: 'An agency in the old city.',
    },
    userId: ownerId,
  })

  assert.equal(response.status, 201)
  assert.equal(response.body.data.nameEn, validOffice.nameEn)
  assert.equal(response.body.data.governorate, 'DAMASCUS')
  // Contact numbers are stored canonically, as on a property listing.
  assert.equal(response.body.data.phone, '+963115550100')
  assert.equal(response.body.data.whatsapp, '0963999888777')
  assert.deepEqual(response.body.data._count, { properties: 0 })
  assert.ok(!JSON.stringify(response.body).includes('ownerId'))
  assert.equal([...offices.values()][0].ownerId, ownerId)
})

test('the second office for one owner is a conflict', async () => {
  const first = await request('/api/v1/offices', {
    method: 'POST',
    body: validOffice,
    userId: ownerId,
  })
  const second = await request('/api/v1/offices', {
    method: 'POST',
    body: { ...validOffice, nameEn: 'Another office' },
    userId: ownerId,
  })

  assert.equal(first.status, 201)
  assert.equal(second.status, 409)
  assert.equal(second.body.error.code, 'OFFICE_ALREADY_EXISTS')
  assert.equal(offices.size, 1)
})

test('rejects an owner-supplied ownerId and other unknown fields', async () => {
  for (const field of ['ownerId', 'id', 'createdAt']) {
    const response = await request('/api/v1/offices', {
      method: 'POST',
      body: { ...validOffice, [field]: otherOwnerId },
      userId: ownerId,
    })
    assert.equal(response.status, 400)
    assert.equal(response.body.error.code, 'INVALID_REQUEST')
  }
})

test('rejects a create that is missing a required name or a bad logo URL', async () => {
  const { nameDe, ...withoutGermanName } = validOffice
  const incomplete = await request('/api/v1/offices', {
    method: 'POST',
    body: withoutGermanName,
    userId: ownerId,
  })
  const unsafeLogo = await request('/api/v1/offices', {
    method: 'POST',
    body: { ...validOffice, logoUrl: 'javascript:alert(1)' },
    userId: ownerId,
  })

  assert.equal(incomplete.status, 400)
  assert.equal(unsafeLogo.status, 400)
  assert.equal(offices.size, 0)
})

test('owner updates their own office', async () => {
  seedOffices()
  const response = await request(`/api/v1/offices/${damascusOfficeId}`, {
    method: 'PATCH',
    body: { city: 'Douma', descriptionEn: null, phone: '0955 123 456' },
    userId: ownerId,
  })

  assert.equal(response.status, 200)
  assert.equal(response.body.data.city, 'Douma')
  assert.equal(response.body.data.descriptionEn, null)
  assert.equal(response.body.data.phone, '0955123456')
})

test('another owner cannot patch an office they do not own', async () => {
  seedOffices()
  const response = await request(`/api/v1/offices/${damascusOfficeId}`, {
    method: 'PATCH',
    body: { city: 'Aleppo' },
    userId: otherOwnerId,
  })

  assert.equal(response.status, 403)
  assert.equal(response.body.error.code, 'FORBIDDEN')
  assert.equal(offices.get(damascusOfficeId).city, 'Damascus')
})

test('an anonymous caller cannot patch an office', async () => {
  seedOffices()
  const response = await request(`/api/v1/offices/${damascusOfficeId}`, {
    method: 'PATCH',
    body: { city: 'Aleppo' },
  })

  assert.equal(response.status, 401)
  assert.equal(offices.get(damascusOfficeId).city, 'Damascus')
})

test('an administrator may patch any office', async () => {
  seedOffices()
  const response = await request(`/api/v1/offices/${damascusOfficeId}`, {
    method: 'PATCH',
    body: { city: 'Homs' },
    userId: adminId,
    role: 'ADMIN',
  })

  assert.equal(response.status, 200)
  assert.equal(response.body.data.city, 'Homs')
  assert.equal(offices.get(damascusOfficeId).ownerId, ownerId)
})

test('patching an unknown office and an empty patch are rejected', async () => {
  seedOffices()
  const missing = await request(`/api/v1/offices/${unknownOfficeId}`, {
    method: 'PATCH',
    body: { city: 'Homs' },
    userId: ownerId,
  })
  const empty = await request(`/api/v1/offices/${damascusOfficeId}`, {
    method: 'PATCH',
    body: {},
    userId: ownerId,
  })
  const unknownField = await request(`/api/v1/offices/${damascusOfficeId}`, {
    method: 'PATCH',
    body: { arbitrary: true },
    userId: ownerId,
  })

  assert.equal(missing.status, 404)
  assert.equal(missing.body.error.code, 'OFFICE_NOT_FOUND')
  assert.equal(empty.status, 400)
  assert.equal(unknownField.status, 400)
})

test('lists offices publicly, newest first, with a published-listing count', async () => {
  seedOffices()
  seedOfficeProperties()
  const response = await request('/api/v1/offices')

  assert.equal(response.status, 200)
  assert.deepEqual(
    response.body.data.map(({ id }) => id),
    [aleppoOfficeId, damascusOfficeId],
  )
  const damascus = response.body.data.find(
    ({ id }) => id === damascusOfficeId,
  )
  // Two of the four seeded listings are published; DRAFT and ARCHIVED are not
  // counted.
  assert.equal(damascus._count.properties, 2)
  assert.ok(!('descriptionAr' in damascus))
  assert.ok(!JSON.stringify(response.body).includes('ownerId'))
  assert.deepEqual(response.body.meta, {
    page: 1,
    pageSize: 20,
    total: 2,
    totalPages: 1,
  })
})

test('filters and paginates the office list', async () => {
  seedOffices()
  const filtered = await request('/api/v1/offices?governorate=aleppo')
  const paged = await request('/api/v1/offices?page=2&pageSize=1')
  const invalid = await request('/api/v1/offices?page=0')
  const unsupported = await request('/api/v1/offices?ownerId=private')

  assert.deepEqual(
    filtered.body.data.map(({ id }) => id),
    [aleppoOfficeId],
  )
  assert.deepEqual(
    paged.body.data.map(({ id }) => id),
    [damascusOfficeId],
  )
  assert.deepEqual(paged.body.meta, {
    page: 2,
    pageSize: 1,
    total: 2,
    totalPages: 2,
  })
  assert.equal(invalid.status, 400)
  assert.equal(invalid.body.error.code, 'INVALID_REQUEST')
  assert.equal(unsupported.status, 400)
})

test('returns office detail with its paginated published listings', async () => {
  seedOffices()
  seedOfficeProperties()
  const response = await request(`/api/v1/offices/${damascusOfficeId}`)
  const secondPage = await request(
    `/api/v1/offices/${damascusOfficeId}?page=2&pageSize=1`,
  )

  assert.equal(response.status, 200)
  assert.equal(response.body.data.id, damascusOfficeId)
  assert.equal(response.body.data.descriptionAr, 'وصف')
  assert.equal(response.body.data._count.properties, 2)
  // Newest first, and neither the DRAFT nor the ARCHIVED listing appears.
  assert.deepEqual(
    response.body.properties.data.map(({ slug }) => slug),
    ['office-listing-a', 'office-listing-b'],
  )
  assert.deepEqual(response.body.properties.meta, {
    page: 1,
    pageSize: 20,
    total: 2,
    totalPages: 1,
  })
  assert.deepEqual(
    secondPage.body.properties.data.map(({ slug }) => slug),
    ['office-listing-b'],
  )
  assert.ok(!JSON.stringify(response.body).includes('ownerId'))
})

test('returns the signed-in owner own office', async () => {
  seedOffices()
  const response = await request('/api/v1/offices/mine', { userId: ownerId })

  assert.equal(response.status, 200)
  assert.equal(response.body.data.id, damascusOfficeId)
  assert.equal(response.body.data.descriptionAr, 'وصف')
  assert.ok(!JSON.stringify(response.body).includes('ownerId'))
})

test('answers 404 when the signed-in owner has no office yet', async () => {
  const response = await request('/api/v1/offices/mine', {
    userId: otherOwnerId,
  })

  assert.equal(response.status, 404)
  assert.equal(response.body.error.code, 'OFFICE_NOT_FOUND')
})

test('the own-office route is never treated as an office id', async () => {
  seedOffices()
  const anonymous = await request('/api/v1/offices/mine')
  const wrongRole = await request('/api/v1/offices/mine', {
    userId: ownerId,
    role: 'USER',
  })

  // Without the dedicated route these would fall through to `/:id` and answer
  // 404 as a public read instead of challenging the caller.
  assert.equal(anonymous.status, 401)
  assert.equal(wrongRole.status, 403)
})

test('creating an office adopts the listings the owner already has', async () => {
  const rows = [
    { id: 'own-unlinked-a', officeId: null, owner: ownerId },
    { id: 'own-unlinked-b', officeId: null, owner: ownerId },
    { id: 'own-elsewhere', officeId: aleppoOfficeId, owner: ownerId },
    { id: 'other-owner', officeId: null, owner: otherOwnerId },
  ]
  for (const row of rows) {
    properties.set(
      row.id,
      propertyRecord({
        id: row.id,
        slug: row.id,
        officeId: row.officeId,
        ownerId: row.owner,
        status: 'AVAILABLE',
        createdAt: new Date('2026-08-01T10:00:00.000Z'),
      }),
    )
  }

  const response = await request('/api/v1/offices', {
    method: 'POST',
    body: validOffice,
    userId: ownerId,
  })

  assert.equal(response.status, 201)
  const createdId = response.body.data.id
  assert.equal(properties.get('own-unlinked-a').officeId, createdId)
  assert.equal(properties.get('own-unlinked-b').officeId, createdId)
  // Already attached elsewhere, and owned by someone else: both untouched.
  assert.equal(properties.get('own-elsewhere').officeId, aleppoOfficeId)
  assert.equal(properties.get('other-owner').officeId, null)
  // The response counts the listings it just adopted.
  assert.equal(response.body.data._count.properties, 2)
})

test('owner deletes their own office and keeps their listings published', async () => {
  seedOffices()
  seedOfficeProperties()
  const response = await request(`/api/v1/offices/${damascusOfficeId}`, {
    method: 'DELETE',
    userId: ownerId,
  })

  assert.equal(response.status, 200)
  assert.equal(response.body.data.id, damascusOfficeId)
  assert.equal(offices.has(damascusOfficeId), false)

  // The four seeded listings are all still there, at the status they had, and
  // simply no longer attributed to an office.
  assert.equal(properties.size, 4)
  for (const property of properties.values()) {
    assert.equal(property.officeId, null)
  }
  assert.deepEqual(
    [...properties.values()].map(({ status }) => status).sort(),
    ['ARCHIVED', 'AVAILABLE', 'DRAFT', 'RENTED'],
  )
})

test('a deleted office is gone from every read', async () => {
  seedOffices()
  seedOfficeProperties()
  await request(`/api/v1/offices/${damascusOfficeId}`, {
    method: 'DELETE',
    userId: ownerId,
  })

  const detail = await request(`/api/v1/offices/${damascusOfficeId}`)
  const mine = await request('/api/v1/offices/mine', { userId: ownerId })
  const list = await request('/api/v1/offices')

  assert.equal(detail.status, 404)
  assert.equal(detail.body.error.code, 'OFFICE_NOT_FOUND')
  // The owner is back to having no office at all, which is the state the
  // dashboard reads as "create your first one".
  assert.equal(mine.status, 404)
  assert.equal(mine.body.error.code, 'OFFICE_NOT_FOUND')
  assert.deepEqual(
    list.body.data.map(({ id }) => id),
    [aleppoOfficeId],
  )
})

test('the unlinked listings stay public under no office', async () => {
  seedOffices()
  seedOfficeProperties()
  const before = await request(`/api/v1/offices/${damascusOfficeId}`)
  await request(`/api/v1/offices/${damascusOfficeId}`, {
    method: 'DELETE',
    userId: ownerId,
  })

  assert.equal(before.body.properties.meta.total, 2)
  // Published before, published after: the delete changed the attribution, not
  // the visibility.
  const published = [...properties.values()].filter(({ status }) =>
    publicStatuses.has(status),
  )
  assert.equal(published.length, 2)
  assert.ok(published.every(({ officeId }) => officeId === null))
})

test('another owner cannot delete an office they do not own', async () => {
  seedOffices()
  const response = await request(`/api/v1/offices/${damascusOfficeId}`, {
    method: 'DELETE',
    userId: otherOwnerId,
  })

  assert.equal(response.status, 403)
  assert.equal(response.body.error.code, 'FORBIDDEN')
  assert.equal(offices.has(damascusOfficeId), true)
})

test('an anonymous caller cannot delete an office', async () => {
  seedOffices()
  const anonymous = await request(`/api/v1/offices/${damascusOfficeId}`, {
    method: 'DELETE',
  })
  const wrongRole = await request(`/api/v1/offices/${damascusOfficeId}`, {
    method: 'DELETE',
    userId: ownerId,
    role: 'USER',
  })

  assert.equal(anonymous.status, 401)
  assert.equal(anonymous.body.error.code, 'AUTHENTICATION_REQUIRED')
  assert.equal(wrongRole.status, 403)
  assert.equal(offices.has(damascusOfficeId), true)
})

test('an administrator may delete any office', async () => {
  seedOffices()
  const response = await request(`/api/v1/offices/${aleppoOfficeId}`, {
    method: 'DELETE',
    userId: adminId,
    role: 'ADMIN',
  })

  assert.equal(response.status, 200)
  assert.equal(offices.has(aleppoOfficeId), false)
  // Someone else's office, and the administrator's own account is untouched.
  assert.equal(offices.get(damascusOfficeId).ownerId, ownerId)
})

test('deleting an unknown office is a structured 404', async () => {
  seedOffices()
  const response = await request(`/api/v1/offices/${unknownOfficeId}`, {
    method: 'DELETE',
    userId: ownerId,
  })

  assert.equal(response.status, 404)
  assert.equal(response.body.error.code, 'OFFICE_NOT_FOUND')
  assert.equal(offices.size, 2)
})

test('an owner may create a new office after deleting the old one', async () => {
  seedOffices()
  await request(`/api/v1/offices/${damascusOfficeId}`, {
    method: 'DELETE',
    userId: ownerId,
  })
  const recreated = await request('/api/v1/offices', {
    method: 'POST',
    body: validOffice,
    userId: ownerId,
  })

  // The "one office per owner" constraint released with the row, so the delete
  // is not a one-way door.
  assert.equal(recreated.status, 201)
  assert.notEqual(recreated.body.data.id, damascusOfficeId)
})

test('returns a structured 404 for an unknown office', async () => {
  seedOffices()
  const response = await request(`/api/v1/offices/${unknownOfficeId}`)

  assert.equal(response.status, 404)
  assert.equal(response.body.error.code, 'OFFICE_NOT_FOUND')
  assert.equal(response.body.error.message, 'The requested office was not found.')
})
