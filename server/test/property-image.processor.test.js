import assert from 'node:assert/strict'
import { test } from 'node:test'

import sharp from 'sharp'

import propertyImageProcessor, {
  maximumImageBytes,
} from '../src/utils/property-image.js'

async function encoded(format, width = 16, height = 12) {
  const image = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: '#785634',
    },
  })
  return format === 'jpeg'
    ? image.jpeg().toBuffer()
    : format === 'png'
      ? image.png().toBuffer()
      : image.webp().toBuffer()
}

for (const [format, mimetype] of [
  ['jpeg', 'image/jpeg'],
  ['png', 'image/png'],
  ['webp', 'image/webp'],
]) {
  test(`decodes ${format} and re-encodes a canonical WebP`, async () => {
    const result = await propertyImageProcessor.process({
      buffer: await encoded(format),
      mimetype,
    })
    const metadata = await sharp(result.buffer).metadata()

    assert.equal(result.mimeType, 'image/webp')
    assert.equal(metadata.format, 'webp')
    assert.equal(result.width, 16)
    assert.equal(result.height, 12)
    assert.equal(result.sizeBytes, result.buffer.length)
  })
}

test('rejects MIME/signature mismatches and unsupported content', async () => {
  await assert.rejects(
    propertyImageProcessor.process({
      buffer: await encoded('png'),
      mimetype: 'image/jpeg',
    }),
    { code: 'INVALID_IMAGE_TYPE' },
  )
  for (const buffer of [
    Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
    Buffer.from('MZ executable'),
    Buffer.from('malformed image'),
  ]) {
    await assert.rejects(
      propertyImageProcessor.process({
        buffer,
        mimetype: 'image/png',
      }),
      { code: 'INVALID_IMAGE_TYPE' },
    )
  }
})

test('rejects valid images with appended polyglot data', async () => {
  const jpeg = await encoded('jpeg')
  await assert.rejects(
    propertyImageProcessor.process({
      buffer: Buffer.concat([jpeg, Buffer.from('appended payload')]),
      mimetype: 'image/jpeg',
    }),
    { code: 'INVALID_IMAGE_TYPE' },
  )
})

test('rejects oversized input before decoding', async () => {
  await assert.rejects(
    propertyImageProcessor.process({
      buffer: Buffer.alloc(maximumImageBytes + 1),
      mimetype: 'image/png',
    }),
    { code: 'IMAGE_TOO_LARGE', statusCode: 413 },
  )
})

test('rejects unsafe dimensions and pixel counts', async () => {
  await assert.rejects(
    propertyImageProcessor.process({
      buffer: await encoded('png', 12_001, 1),
      mimetype: 'image/png',
    }),
    { code: 'UNSAFE_IMAGE_DIMENSIONS' },
  )
})
