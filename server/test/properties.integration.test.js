import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'

let baseUrl
let prisma
let server

const knownPropertySlugs = [
  'aleppo-villa',
  'damascus-courtyard',
  'latakia-apartment',
]

before(async () => {
  process.env.CORS_ORIGINS = 'http://localhost'
  const [{ default: app }, { default: database }] = await Promise.all([
    import('../src/app.js'),
    import('../src/config/database.js'),
  ])
  prisma = database
  server = app.listen(0)
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })
  const address = server.address()
  baseUrl = `http://127.0.0.1:${address.port}`
})

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }
  if (prisma) await prisma.$disconnect()
})

async function request(path) {
  const response = await fetch(`${baseUrl}${path}`)
  return {
    body: await response.json(),
    status: response.status,
  }
}

test('lists properties with ordered images and public fields', async () => {
  const { body, status } = await request('/api/v1/properties')

  assert.equal(status, 200)
  assert.ok(body.meta.total >= knownPropertySlugs.length)
  const knownProperties = body.data.filter(({ slug }) =>
    knownPropertySlugs.includes(slug),
  )
  assert.equal(knownProperties.length, knownPropertySlugs.length)
  assert.ok(knownProperties.every(({ images }) => images.length === 1))
  assert.ok(
    body.data.every(({ images }) =>
      images.every(
        (image, index) =>
          index === 0 || images[index - 1].sortOrder <= image.sortOrder,
      ),
    ),
  )
  assert.ok(body.data.every((property) => !('ownerId' in property)))
  assert.ok(body.data.every((property) => !('owner' in property)))
})

test('filters properties by supported criteria', async () => {
  const { body, status } = await request(
    '/api/v1/properties?transactionType=buy&propertyType=house&governorate=damascus&status=available&minPrice=200000&maxPrice=250000&currency=usd',
  )
  const uppercaseEnum = await request(
    '/api/v1/properties?transactionType=RENT',
  )

  assert.equal(status, 200)
  assert.deepEqual(
    body.data.map(({ slug }) => slug),
    ['damascus-courtyard'],
  )
  assert.equal(uppercaseEnum.status, 200)
  assert.ok(
    uppercaseEnum.body.data.some(
      ({ slug }) => slug === 'latakia-apartment',
    ),
  )
  assert.ok(
    uppercaseEnum.body.data.every(
      ({ transaction }) => transaction === 'RENT',
    ),
  )
})

test('sorts properties by price', async () => {
  const { body, status } = await request(
    '/api/v1/properties?sort=price-asc',
  )

  assert.equal(status, 200)
  assert.ok(
    body.data.every(
      (property, index) =>
        index === 0 ||
        Number(body.data[index - 1].price) <= Number(property.price),
    ),
  )
  const knownOrder = body.data
    .filter(({ slug }) => knownPropertySlugs.includes(slug))
    .map(({ slug }) => slug)
  assert.deepEqual(knownOrder, [
    'aleppo-villa',
    'latakia-apartment',
    'damascus-courtyard',
  ])
})

test('paginates property results', async () => {
  const complete = await request(
    '/api/v1/properties?sort=price-asc&page=1&pageSize=100',
  )
  const { body, status } = await request(
    '/api/v1/properties?sort=price-asc&page=2&pageSize=2',
  )

  assert.equal(complete.status, 200)
  assert.equal(status, 200)
  assert.deepEqual(
    body.data.map(({ slug }) => slug),
    complete.body.data.slice(2, 4).map(({ slug }) => slug),
  )
  assert.deepEqual(body.meta, {
    page: 2,
    pageSize: 2,
    total: complete.body.meta.total,
    totalPages: Math.ceil(complete.body.meta.total / 2),
  })
})

test('returns property details by slug with locale-ready content', async () => {
  const { body, status } = await request(
    '/api/v1/properties/damascus-courtyard',
  )

  assert.equal(status, 200)
  assert.equal(body.data.slug, 'damascus-courtyard')
  assert.equal(typeof body.data.titleEn, 'string')
  assert.equal(typeof body.data.titleAr, 'string')
  assert.equal(typeof body.data.titleDe, 'string')
  assert.equal(body.data.images.length, 1)
  assert.ok(!('ownerId' in body.data))
})

test('returns a structured 404 for an unknown property slug', async () => {
  const { body, status } = await request(
    '/api/v1/properties/unknown-property',
  )

  assert.equal(status, 404)
  assert.equal(body.error.code, 'PROPERTY_NOT_FOUND')
  assert.equal(body.error.message, 'The requested property was not found.')
  assert.match(body.error.requestId, /^[A-Za-z0-9_-]{8,64}$/)
})

test('rejects invalid and unsupported query parameters', async () => {
  const invalidPage = await request('/api/v1/properties?page=0')
  const unsupported = await request('/api/v1/properties?ownerId=private')

  assert.equal(invalidPage.status, 400)
  assert.equal(invalidPage.body.error.code, 'INVALID_REQUEST')
  assert.equal(unsupported.status, 400)
  assert.equal(unsupported.body.error.code, 'INVALID_REQUEST')
})
