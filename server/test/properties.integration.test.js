import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'

let baseUrl
let prisma
let server

/**
 * This suite owns its data.
 *
 * It used to assert against the rows `prisma/seed.js` installs, which made it
 * fail whenever anybody used the application against the development database
 * — deleting a showcase listing broke a test that had nothing to do with the
 * change. Everything asserted below is created in `before` and removed in
 * `after`, under slugs no other fixture uses, so the suite is unaffected by
 * whatever else the database happens to hold.
 *
 * The rows are still read through the public API rather than the repository:
 * this is the one suite that exercises the real stack end to end.
 */
const fixtureOwnerEmail = 'properties-integration@test.invalid'

// Prices are far apart and deliberately unround so the sort assertion reads
// unambiguously and the narrow price filter cannot be satisfied by accident.
const fixtures = [
  {
    slug: 'test-pub-1',
    titleEn: 'Test public villa',
    titleAr: 'فيلا اختبار عامة',
    titleDe: 'Test-Villa öffentlich',
    transaction: 'BUY',
    propertyType: 'VILLA',
    status: 'RESERVED',
    governorate: 'ALEPPO',
    city: 'Aleppo',
    price: 111111,
    area: 400,
    // Two images, stored out of order, so the response proves the query sorts
    // them rather than returning insertion order.
    images: [
      { url: 'https://images.test.invalid/pub-1-b.webp', sortOrder: 1 },
      { url: 'https://images.test.invalid/pub-1-a.webp', sortOrder: 0 },
    ],
  },
  {
    slug: 'test-pub-2',
    titleEn: 'Test public apartment',
    titleAr: 'شقة اختبار عامة',
    titleDe: 'Test-Wohnung öffentlich',
    transaction: 'RENT',
    propertyType: 'APARTMENT',
    status: 'AVAILABLE',
    governorate: 'LATAKIA',
    city: 'Latakia',
    price: 222222,
    area: 120,
    images: [{ url: 'https://images.test.invalid/pub-2-a.webp', sortOrder: 0 }],
  },
  {
    slug: 'test-pub-3',
    titleEn: 'Test public house',
    titleAr: 'منزل اختبار عام',
    titleDe: 'Test-Haus öffentlich',
    transaction: 'BUY',
    propertyType: 'HOUSE',
    status: 'AVAILABLE',
    governorate: 'DAMASCUS',
    city: 'Damascus',
    price: 333333,
    area: 180,
    // Exactly one, which the detail assertion depends on.
    images: [{ url: 'https://images.test.invalid/pub-3-a.webp', sortOrder: 0 }],
  },
]

const fixtureSlugs = fixtures.map(({ slug }) => slug)

// Newest first is the default sort, so a fixture created now sits at the head
// of the list and stays reachable inside one page whatever else exists.
const fixtureCreatedAt = new Date()

let fixtureOwnerId

async function installFixtures() {
  const owner = await prisma.user.upsert({
    where: { email: fixtureOwnerEmail },
    update: {},
    create: {
      email: fixtureOwnerEmail,
      name: 'Properties integration fixture owner',
      role: 'USER',
    },
    select: { id: true },
  })
  fixtureOwnerId = owner.id

  for (const { images, ...property } of fixtures) {
    const record = {
      ...property,
      currency: 'USD',
      ownerId: owner.id,
      createdAt: fixtureCreatedAt,
    }
    // Upsert rather than create: a run that was interrupted before `after`
    // must not leave the next one unable to start.
    const saved = await prisma.property.upsert({
      where: { slug: property.slug },
      update: record,
      create: record,
      select: { id: true },
    })

    await prisma.propertyImage.deleteMany({ where: { propertyId: saved.id } })
    for (const image of images) {
      await prisma.propertyImage.create({
        data: { ...image, propertyId: saved.id },
      })
    }
  }
}

async function removeFixtures() {
  // The images go with the listings through the FK cascade; the owner can only
  // be removed once nothing references it, since Property.owner is Restrict.
  await prisma.property.deleteMany({ where: { slug: { in: fixtureSlugs } } })
  if (fixtureOwnerId) {
    await prisma.user.deleteMany({ where: { id: fixtureOwnerId } })
  }
}

before(async () => {
  process.env.CORS_ORIGINS = 'http://localhost'
  const [{ default: app }, { default: database }] = await Promise.all([
    import('../src/app.js'),
    import('../src/config/database.js'),
  ])
  prisma = database
  await installFixtures()
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
  if (prisma) {
    await removeFixtures()
    await prisma.$disconnect()
  }
})

async function request(path) {
  const response = await fetch(`${baseUrl}${path}`)
  return {
    body: await response.json(),
    status: response.status,
  }
}

function ownRows(data) {
  return data.filter(({ slug }) => fixtureSlugs.includes(slug))
}

test('lists properties with ordered images and public fields', async () => {
  const { body, status } = await request('/api/v1/properties?pageSize=100')

  assert.equal(status, 200)
  assert.ok(body.meta.total >= fixtureSlugs.length)

  const own = ownRows(body.data)
  assert.deepEqual(
    own.map(({ slug }) => slug).sort(),
    [...fixtureSlugs].sort(),
  )
  assert.ok(own.every(({ images }) => images.length >= 1))
  // The gallery comes back in `sortOrder`, not insertion order: test-pub-1 was
  // stored with its second image first.
  const villa = own.find(({ slug }) => slug === 'test-pub-1')
  assert.deepEqual(
    villa.images.map(({ sortOrder }) => sortOrder),
    [0, 1],
  )
  assert.match(villa.images[0].url, /pub-1-a/)

  // Asserted across every row on the page, not only the fixtures: no public
  // response may carry the owner, whoever created the listing.
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
    '/api/v1/properties?transactionType=buy&propertyType=house&governorate=damascus&status=available&minPrice=333000&maxPrice=334000&currency=usd&pageSize=100',
  )
  const uppercaseEnum = await request(
    '/api/v1/properties?transactionType=RENT&pageSize=100',
  )

  assert.equal(status, 200)
  // The fixture that matches every clause is returned…
  assert.ok(body.data.some(({ slug }) => slug === 'test-pub-3'))
  // …the two that do not are excluded…
  assert.ok(!body.data.some(({ slug }) => slug === 'test-pub-1'))
  assert.ok(!body.data.some(({ slug }) => slug === 'test-pub-2'))
  // …and whatever else the database holds, every row obeys the same filter.
  assert.ok(
    body.data.every(
      (property) =>
        property.transaction === 'BUY' &&
        property.propertyType === 'HOUSE' &&
        property.governorate === 'DAMASCUS' &&
        property.status === 'AVAILABLE' &&
        property.currency === 'USD' &&
        Number(property.price) >= 333000 &&
        Number(property.price) <= 334000,
    ),
  )

  assert.equal(uppercaseEnum.status, 200)
  assert.ok(uppercaseEnum.body.data.some(({ slug }) => slug === 'test-pub-2'))
  assert.ok(
    uppercaseEnum.body.data.every(({ transaction }) => transaction === 'RENT'),
  )
})

test('sorts properties by price', async () => {
  const { body, status } = await request(
    '/api/v1/properties?sort=price-asc&pageSize=100',
  )

  assert.equal(status, 200)
  assert.ok(
    body.data.every(
      (property, index) =>
        index === 0 ||
        Number(body.data[index - 1].price) <= Number(property.price),
    ),
  )
  // Cheapest to dearest among the rows this suite controls, whatever sits
  // between them.
  assert.deepEqual(ownRows(body.data).map(({ slug }) => slug), [
    'test-pub-1',
    'test-pub-2',
    'test-pub-3',
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
  const { body, status } = await request('/api/v1/properties/test-pub-3')

  assert.equal(status, 200)
  assert.equal(body.data.slug, 'test-pub-3')
  assert.equal(body.data.titleEn, 'Test public house')
  assert.equal(body.data.titleAr, 'منزل اختبار عام')
  assert.equal(body.data.titleDe, 'Test-Haus öffentlich')
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
