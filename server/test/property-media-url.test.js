import assert from 'node:assert/strict'
import { test } from 'node:test'

process.env.CORS_ORIGINS = 'https://client.example'

const [
  {
    createPropertyMediaUrls,
    imageSignedUrlSeconds,
    isPubliclyVisible,
    videoSignedUrlSeconds,
  },
  { createPropertyVideoService },
] = await Promise.all([
  import('../src/services/property-media-url.service.js'),
  import('../src/services/property-video.service.js'),
])

const publicUrl = 'https://storage.example/object/public/property-images/a.webp'
const storagePath = 'properties/44444444-4444-4444-8444-444444444444/a.webp'

function storedImage(overrides = {}) {
  return { id: 'image-1', url: publicUrl, storagePath, ...overrides }
}

/**
 * Stands in for the Storage adapter. Records every batch it is asked to sign so
 * a test can assert both the expiry requested and that a published listing
 * caused no call at all.
 */
function createStorage(calls, name) {
  return {
    async createSignedUrls(paths, expiresInSeconds) {
      calls.push({ bucket: name, paths: [...paths], expiresInSeconds })
      return new Map(
        paths.map((path) => [path, `https://storage.example/sign/${path}?token=t`]),
      )
    },
  }
}

function createMediaUrls(overrides = {}) {
  const calls = []
  const mediaUrls = createPropertyMediaUrls({
    imageStorage: createStorage(calls, 'images'),
    videoStorage: createStorage(calls, 'videos'),
    log: { error: () => {} },
    ...overrides,
  })
  return { calls, mediaUrls }
}

test('an unpublished listing answers with a signed URL, never the public one', async () => {
  for (const status of ['DRAFT', 'PENDING_REVIEW', 'REJECTED', 'ARCHIVED']) {
    const { calls, mediaUrls } = createMediaUrls()

    const [url] = await mediaUrls.forImages(status, [storedImage()])

    assert.equal(url, `https://storage.example/sign/${storagePath}?token=t`)
    assert.ok(!url.includes('/object/public/'))
    assert.deepEqual(calls[0].paths, [storagePath])
  }
})

test('a published listing keeps the permanent public URL, unsigned and cacheable', async () => {
  for (const status of ['AVAILABLE', 'RESERVED', 'SOLD', 'RENTED']) {
    const { calls, mediaUrls } = createMediaUrls()

    const [url] = await mediaUrls.forImages(status, [storedImage()])

    // Unchanged URL means an unchanged CDN cache key: the object stays cached
    // for every visitor rather than being re-signed per request.
    assert.equal(url, publicUrl)
    assert.deepEqual(calls, [])
  }
})

test('signed URLs expire: one hour for an image, half an hour for a video', async () => {
  const { calls, mediaUrls } = createMediaUrls()

  await mediaUrls.forImages('DRAFT', [storedImage()])
  await mediaUrls.forVideo('DRAFT', {
    videoUrl: 'https://storage.example/object/public/property-videos/a.mp4',
    videoStoragePath: 'properties/p/videos/a.mp4',
  })

  assert.equal(imageSignedUrlSeconds, 3600)
  assert.equal(videoSignedUrlSeconds, 1800)
  assert.deepEqual(
    calls.map(({ bucket, expiresInSeconds }) => [bucket, expiresInSeconds]),
    [
      ['images', 3600],
      ['videos', 1800],
    ],
  )
})

test('a status this service does not recognise is treated as private', async () => {
  assert.equal(isPubliclyVisible(undefined), false)
  assert.equal(isPubliclyVisible('SOMETHING_NEW'), false)

  const { calls, mediaUrls } = createMediaUrls()
  const [url] = await mediaUrls.forImages(undefined, [storedImage()])

  assert.match(url, /\/sign\//)
  assert.equal(calls.length, 1)
})

test('storage failing hides the media rather than falling back to the public URL', async () => {
  const { mediaUrls } = createMediaUrls({
    imageStorage: {
      async createSignedUrls() {
        throw new Error('Storage is unreachable.')
      },
    },
  })

  const [url] = await mediaUrls.forImages('DRAFT', [storedImage()])

  assert.equal(url, null)
})

test('an image Storage never stored is passed through as authored', async () => {
  const { calls, mediaUrls } = createMediaUrls()
  const legacy = storedImage({
    storagePath: null,
    url: 'https://images.test.invalid/legacy.webp',
  })

  const [url] = await mediaUrls.forImages('DRAFT', [legacy])

  assert.equal(url, 'https://images.test.invalid/legacy.webp')
  assert.deepEqual(calls, [])
})

test('a page of listings is signed in one call per bucket', async () => {
  const { calls, mediaUrls } = createMediaUrls()
  const properties = [
    {
      status: 'DRAFT',
      images: [storedImage({ storagePath: 'a.webp' })],
      videoStoragePath: 'a.mp4',
    },
    {
      status: 'PENDING_REVIEW',
      images: [
        storedImage({ storagePath: 'b.webp' }),
        storedImage({ storagePath: 'c.webp' }),
      ],
      videoStoragePath: null,
    },
    {
      status: 'AVAILABLE',
      images: [storedImage({ storagePath: 'published.webp' })],
      videoStoragePath: 'published.mp4',
    },
  ]

  const media = await mediaUrls.forProperties(properties)

  assert.equal(calls.length, 2)
  const images = calls.find(({ bucket }) => bucket === 'images')
  const videos = calls.find(({ bucket }) => bucket === 'videos')
  // The published listing contributes nothing to either batch.
  assert.deepEqual(images.paths, ['a.webp', 'b.webp', 'c.webp'])
  assert.deepEqual(videos.paths, ['a.mp4'])

  assert.match(media.imageUrl('DRAFT', properties[0].images[0]), /\/sign\//)
  assert.match(media.videoUrl('DRAFT', properties[0]), /\/sign\//)
  assert.equal(media.imageUrl('AVAILABLE', properties[2].images[0]), publicUrl)
})

// --- The video service, which resolves the URL it answers an upload with ---

const propertyId = '44444444-4444-4444-8444-444444444444'
const owner = { id: '11111111-1111-4111-8111-111111111111', role: 'OWNER' }

function createVideoService(status, mediaUrls) {
  return createPropertyVideoService({
    createId: () => 'video-id',
    loadHeader: async () => Buffer.from([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0, 0, 0, 0]),
    openReadStream: () => 'stream',
    removeUpload: async () => {},
    mediaUrls,
    repository: {
      async findPropertyOwnership() {
        return { id: propertyId, ownerId: owner.id, status }
      },
      async findPropertyVideo() {
        return null
      },
      async attachPropertyVideo() {
        return 1
      },
      async clearPropertyVideo() {
        return 1
      },
    },
    storage: {
      async upload() {
        return {
          url: 'https://storage.example/object/public/property-videos/a.mp4',
        }
      },
    },
  })
}

const uploadedFile = {
  path: '/tmp/upload',
  mimetype: 'video/mp4',
  size: 2_048,
}

test('uploading to a draft listing answers with a signed video URL', async () => {
  const { mediaUrls } = createMediaUrls()
  const video = await createVideoService('DRAFT', mediaUrls).uploadVideo(
    propertyId,
    uploadedFile,
    owner,
  )

  assert.match(video.url, /\/sign\//)
  assert.ok(!video.url.includes('/object/public/'))
})

test('uploading to a published listing answers with the public video URL', async () => {
  const { calls, mediaUrls } = createMediaUrls()
  const video = await createVideoService('AVAILABLE', mediaUrls).uploadVideo(
    propertyId,
    uploadedFile,
    owner,
  )

  assert.equal(
    video.url,
    'https://storage.example/object/public/property-videos/a.mp4',
  )
  assert.deepEqual(calls, [])
})

// --- The management write, which answers with the listing it just wrote ---

const { createPropertyManagementService } = await import(
  '../src/services/property.service.js'
)

function createManagementService(status, mediaUrls) {
  const stored = {
    id: propertyId,
    slug: 'a-slug',
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
    createdAt: new Date('2026-07-25T12:00:00.000Z'),
    updatedAt: new Date('2026-07-25T12:00:00.000Z'),
    images: [storedImage()],
  }

  return createPropertyManagementService({
    mediaUrls,
    notifier: { async notifyPendingReview() {} },
    repository: {
      async findPropertyOwnership() {
        return { id: propertyId, ownerId: owner.id, status }
      },
      async updateProperty(_id, data) {
        return { ...stored, ...data }
      },
    },
  })
}

test('editing a draft answers with signed image URLs and no storage path', async () => {
  const { mediaUrls } = createMediaUrls()
  const property = await createManagementService('DRAFT', mediaUrls)
    .updateProperty(propertyId, { city: 'Aleppo' }, owner)

  assert.equal(property.images.length, 1)
  assert.match(property.images[0].url, /\/sign\//)
  assert.ok(!Object.hasOwn(property.images[0], 'storagePath'))
})

test('editing a published listing answers with its public image URLs', async () => {
  const { calls, mediaUrls } = createMediaUrls()
  const property = await createManagementService('AVAILABLE', mediaUrls)
    .updateProperty(propertyId, { city: 'Aleppo' }, owner)

  assert.equal(property.images[0].url, publicUrl)
  assert.ok(!Object.hasOwn(property.images[0], 'storagePath'))
  assert.deepEqual(calls, [])
})
