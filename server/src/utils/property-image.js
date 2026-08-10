import sharp from 'sharp'

export const maximumImageBytes = 8 * 1024 * 1024
export const maximumImageDimension = 12_000
export const maximumImagePixels = 40_000_000
export const maximumImagesPerProperty = 20

const sourceMimeTypes = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

function detectContainerMimeType(buffer) {
  if (
    buffer.length >= 4 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff &&
    buffer.at(-2) === 0xff &&
    buffer.at(-1) === 0xd9
  ) {
    return 'image/jpeg'
  }
  if (
    buffer.length >= 20 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ) &&
    buffer.readUInt32BE(buffer.length - 12) === 0 &&
    buffer.subarray(buffer.length - 8, buffer.length - 4).toString() ===
      'IEND'
  ) {
    return 'image/png'
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString() === 'RIFF' &&
    buffer.subarray(8, 12).toString() === 'WEBP' &&
    buffer.readUInt32LE(4) + 8 === buffer.length
  ) {
    return 'image/webp'
  }
  return null
}

function imageError(code, message, statusCode = 400) {
  const error = new Error(message)
  error.code = code
  error.statusCode = statusCode
  return error
}

export function createPropertyImageProcessor({
  sharpFactory = sharp,
} = {}) {
  return {
    async process(file) {
      if (!file?.buffer || file.buffer.length === 0) {
        throw imageError('IMAGE_REQUIRED', 'Exactly one image is required.')
      }
      if (file.buffer.length > maximumImageBytes) {
        throw imageError('IMAGE_TOO_LARGE', 'The image exceeds 8 MiB.', 413)
      }
      if (detectContainerMimeType(file.buffer) !== file.mimetype) {
        throw imageError(
          'INVALID_IMAGE_TYPE',
          'The image type or signature is not supported.',
        )
      }

      let metadata
      try {
        metadata = await sharpFactory(file.buffer, {
          failOn: 'error',
          limitInputPixels: maximumImagePixels,
          sequentialRead: true,
        }).metadata()
      } catch {
        throw imageError('INVALID_IMAGE', 'The image is invalid or unsupported.')
      }

      const actualMimeType = sourceMimeTypes[metadata.format]
      if (!actualMimeType || actualMimeType !== file.mimetype) {
        throw imageError(
          'INVALID_IMAGE_TYPE',
          'The image type or signature is not supported.',
        )
      }
      if (
        !metadata.width ||
        !metadata.height ||
        metadata.width > maximumImageDimension ||
        metadata.height > maximumImageDimension ||
        metadata.width * metadata.height > maximumImagePixels ||
        (metadata.pages ?? 1) !== 1
      ) {
        throw imageError(
          'UNSAFE_IMAGE_DIMENSIONS',
          'The image dimensions are not allowed.',
        )
      }

      let buffer
      let outputMetadata
      try {
        buffer = await sharpFactory(file.buffer, {
          failOn: 'error',
          limitInputPixels: maximumImagePixels,
          sequentialRead: true,
        })
          .rotate()
          .webp({ effort: 4, quality: 82 })
          .toBuffer()
        outputMetadata = await sharpFactory(buffer).metadata()
      } catch {
        throw imageError('INVALID_IMAGE', 'The image could not be processed.')
      }

      if (buffer.length > maximumImageBytes) {
        throw imageError(
          'IMAGE_TOO_LARGE',
          'The processed image exceeds 8 MiB.',
          413,
        )
      }

      return {
        buffer,
        mimeType: 'image/webp',
        sizeBytes: buffer.length,
        width: outputMetadata.width,
        height: outputMetadata.height,
      }
    },
  }
}

const propertyImageProcessor = createPropertyImageProcessor()

export default propertyImageProcessor
