import assert from 'node:assert/strict'
import { test } from 'node:test'

process.env.CORS_ORIGINS = 'https://client.example'

const [{ createPropertyImageService }, { createPropertyMediaUrls }] =
  await Promise.all([
    import('../src/services/property-image.service.js'),
    import('../src/services/property-media-url.service.js'),
  ])

const owner = {
  id: '11111111-1111-4111-8111-111111111111',
  role: 'OWNER',
}
const otherOwnerId = '22222222-2222-4222-8222-222222222222'
const propertyId = '33333333-3333-4333-8333-333333333333'
const imageId = '44444444-4444-4444-8444-444444444444'

function savedImage(overrides = {}) {
  return {
    id: imageId,
    propertyId,
    url: 'https://public.example/image.webp',
    storagePath: `properties/${propertyId}/random.webp`,
    mimeType: 'image/webp',
    sizeBytes: 100,
    width: 20,
    height: 10,
    altEn: null,
    altAr: null,
    altDe: null,
    sortOrder: 0,
    createdAt: new Date('2026-07-26T00:00:00.000Z'),
    ...overrides,
  }
}

function createMocks({ status = 'AVAILABLE', ...overrides } = {}) {
  const calls = {
    creates: [],
    uploads: [],
    removes: [],
    downloads: [],
    signings: [],
  }
  const propertyRepository = {
    async findPropertyOwnership() {
      return { id: propertyId, ownerId: owner.id, status }
    },
  }
  // The real resolver over a stubbed bucket, so the published/unpublished
  // decision under test is the one the server actually makes.
  const mediaUrls = createPropertyMediaUrls({
    log: { error: () => {} },
    imageStorage: {
      async createSignedUrls(paths, expiresInSeconds) {
        calls.signings.push({ paths: [...paths], expiresInSeconds })
        return new Map(
          paths.map((path) => [path, `https://signed.example/${path}`]),
        )
      },
    },
  })
  const imageRepository = {
    async countPropertyImages() {
      return 0
    },
    async createWithinLimit(data) {
      calls.creates.push(data)
      return { image: savedImage(data), limitReached: false }
    },
    async reorder(_propertyId, imageIds) {
      return {
        invalidSet: false,
        images: imageIds.map((id, sortOrder) =>
          savedImage({ id, sortOrder }),
        ),
      }
    },
    async listImages() {
      return [savedImage()]
    },
    async findImage() {
      return savedImage()
    },
    async deleteAndCompact() {
      return { deleted: true }
    },
  }
  const storage = {
    async upload(path) {
      calls.uploads.push(path)
      return { url: 'https://public.example/image.webp' }
    },
    async remove(path) {
      calls.removes.push(path)
    },
    async download(path) {
      calls.downloads.push(path)
      return Buffer.from('webp backup')
    },
  }
  const processor = {
    async process() {
      return {
        buffer: Buffer.from('canonical webp'),
        mimeType: 'image/webp',
        sizeBytes: 100,
        width: 20,
        height: 10,
      }
    },
  }
  const dependencies = {
    propertyRepository,
    imageRepository,
    mediaUrls,
    storage,
    processor,
    createId: () => '55555555-5555-4555-8555-555555555555',
    ...overrides,
  }
  return {
    calls,
    dependencies,
    service: createPropertyImageService(dependencies),
  }
}

test('owner uploads to an owned property with safe metadata', async () => {
  const { calls, service } = createMocks()
  const image = await service.uploadImage(
    propertyId,
    { buffer: Buffer.from('source'), mimetype: 'image/jpeg' },
    { altEn: 'Safe alt' },
    owner,
  )

  assert.equal(calls.uploads.length, 1)
  assert.equal(calls.creates.length, 1)
  assert.equal(calls.creates[0].mimeType, 'image/webp')
  assert.equal(calls.creates[0].propertyId, propertyId)
  assert.match(calls.uploads[0], new RegExp(`^properties/${propertyId}/`))
  assert.ok(!Object.hasOwn(image, 'storagePath'))
  assert.ok(!Object.hasOwn(image, 'propertyId'))
})

test('an upload to a listing under review answers with a signed URL', async () => {
  for (const status of ['DRAFT', 'PENDING_REVIEW', 'REJECTED']) {
    const { calls, service } = createMocks({ status })
    const image = await service.uploadImage(
      propertyId,
      { buffer: Buffer.from('source'), mimetype: 'image/jpeg' },
      {},
      owner,
    )

    assert.equal(
      image.url,
      `https://signed.example/properties/${propertyId}/55555555-5555-4555-8555-555555555555.webp`,
    )
    assert.equal(calls.signings.at(-1).expiresInSeconds, 3600)
    assert.ok(!Object.hasOwn(image, 'storagePath'))
  }
})

test('an upload to a published listing keeps the public URL unsigned', async () => {
  const { calls, service } = createMocks({ status: 'AVAILABLE' })
  const image = await service.uploadImage(
    propertyId,
    { buffer: Buffer.from('source'), mimetype: 'image/jpeg' },
    {},
    owner,
  )

  assert.equal(image.url, 'https://public.example/image.webp')
  assert.deepEqual(calls.signings, [])
})

test('reordering a draft returns signed URLs for every image', async () => {
  const { service } = createMocks({ status: 'DRAFT' })
  const images = await service.reorderImages(propertyId, [imageId], owner)

  assert.equal(images.length, 1)
  assert.match(images[0].url, /^https:\/\/signed\.example\//)

  const primary = await service.setPrimaryImage(propertyId, imageId, owner)
  assert.match(primary[0].url, /^https:\/\/signed\.example\//)
})

test('denies non-owner while allowing ADMIN ownership override', async () => {
  const propertyRepository = {
    async findPropertyOwnership() {
      return { id: propertyId, ownerId: otherOwnerId }
    },
  }
  const denied = createMocks({ propertyRepository }).service
  await assert.rejects(
    denied.authorizeProperty(propertyId, owner),
    { code: 'FORBIDDEN', statusCode: 403 },
  )
  await denied.authorizeProperty(propertyId, {
    id: owner.id,
    role: 'ADMIN',
  })
})

test('returns structured missing property and image errors', async () => {
  const missingProperty = createMocks({
    propertyRepository: {
      async findPropertyOwnership() {
        return null
      },
    },
  }).service
  await assert.rejects(
    missingProperty.authorizeProperty(propertyId, owner),
    { code: 'PROPERTY_NOT_FOUND', statusCode: 404 },
  )

  const mocks = createMocks()
  mocks.dependencies.imageRepository.findImage = async () => null
  const missingImage = createPropertyImageService(mocks.dependencies)
  await assert.rejects(
    missingImage.deleteImage(propertyId, imageId, owner),
    { code: 'PROPERTY_IMAGE_NOT_FOUND', statusCode: 404 },
  )
})

test('enforces the maximum before upload and under a racing create', async () => {
  const beforeUpload = createMocks()
  beforeUpload.dependencies.imageRepository.countPropertyImages =
    async () => 20
  const capped = createPropertyImageService(beforeUpload.dependencies)
  await assert.rejects(
    capped.uploadImage(propertyId, {}, {}, owner),
    { code: 'IMAGE_LIMIT_REACHED', statusCode: 409 },
  )
  assert.equal(beforeUpload.calls.uploads.length, 0)

  let creates = 0
  const racing = createMocks()
  racing.dependencies.imageRepository.createWithinLimit = async (data) => {
    creates += 1
    return creates === 1
      ? { image: savedImage(data), limitReached: false }
      : { limitReached: true }
  }
  racing.dependencies.createId = () => `${creates + 1}-random`
  const service = createPropertyImageService(racing.dependencies)
  const results = await Promise.allSettled([
    service.uploadImage(propertyId, {}, {}, owner),
    service.uploadImage(propertyId, {}, {}, owner),
  ])
  assert.equal(results.filter(({ status }) => status === 'fulfilled').length, 1)
  assert.equal(results.filter(({ status }) => status === 'rejected').length, 1)
  assert.equal(racing.calls.removes.length, 1)
})

test('Storage failure leaves no row and database failure cleans Storage', async () => {
  const storageFailure = createMocks()
  storageFailure.dependencies.storage.upload = async () => {
    throw new Error('storage unavailable')
  }
  const failedStorageService = createPropertyImageService(
    storageFailure.dependencies,
  )
  await assert.rejects(
    failedStorageService.uploadImage(propertyId, {}, {}, owner),
  )
  assert.equal(storageFailure.calls.creates.length, 0)

  const databaseFailure = createMocks()
  databaseFailure.dependencies.imageRepository.createWithinLimit =
    async () => {
      throw new Error('database unavailable')
    }
  const failedDatabaseService = createPropertyImageService(
    databaseFailure.dependencies,
  )
  await assert.rejects(
    failedDatabaseService.uploadImage(propertyId, {}, {}, owner),
  )
  assert.equal(databaseFailure.calls.removes.length, 1)
})

test('generated object paths are collision-resistant across uploads', async () => {
  const mocks = createMocks()
  let sequence = 0
  mocks.dependencies.createId = () => `random-${sequence += 1}`
  const service = createPropertyImageService(mocks.dependencies)
  await service.uploadImage(propertyId, {}, {}, owner)
  await service.uploadImage(propertyId, {}, {}, owner)

  assert.equal(new Set(mocks.calls.uploads).size, 2)
  assert.ok(mocks.calls.uploads.every((path) => path.endsWith('.webp')))
})

test('validates complete reorder sets and primary selection is idempotent', async () => {
  const invalid = createMocks()
  invalid.dependencies.imageRepository.reorder = async () => ({
    invalidSet: true,
  })
  const invalidService = createPropertyImageService(invalid.dependencies)
  await assert.rejects(
    invalidService.reorderImages(propertyId, [imageId], owner),
    { code: 'INVALID_IMAGE_ORDER' },
  )

  const mocks = createMocks()
  const first = await mocks.service.setPrimaryImage(
    propertyId,
    imageId,
    owner,
  )
  const second = await mocks.service.setPrimaryImage(
    propertyId,
    imageId,
    owner,
  )
  assert.equal(first[0].id, imageId)
  assert.equal(first[0].sortOrder, 0)
  assert.deepEqual(second, first)
})

test('targeted delete preserves metadata on Storage failure and restores on database failure', async () => {
  const storageFailure = createMocks()
  let databaseDeletes = 0
  storageFailure.dependencies.storage.remove = async () => {
    throw new Error('remove failed')
  }
  storageFailure.dependencies.imageRepository.deleteAndCompact =
    async () => {
      databaseDeletes += 1
      return { deleted: true }
    }
  await assert.rejects(
    createPropertyImageService(storageFailure.dependencies).deleteImage(
      propertyId,
      imageId,
      owner,
    ),
  )
  assert.equal(databaseDeletes, 0)

  const databaseFailure = createMocks()
  databaseFailure.dependencies.imageRepository.deleteAndCompact =
    async () => {
      throw new Error('database failed')
    }
  await assert.rejects(
    createPropertyImageService(databaseFailure.dependencies).deleteImage(
      propertyId,
      imageId,
      owner,
    ),
  )
  assert.equal(databaseFailure.calls.downloads.length, 1)
  assert.equal(databaseFailure.calls.removes.length, 1)
  assert.equal(databaseFailure.calls.uploads.length, 1)
})
