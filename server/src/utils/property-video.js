export const maximumVideoBytes = 4 * 1024 * 1024 * 1024

export const videoExtensions = Object.freeze({
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/x-matroska': 'mkv',
  'video/x-msvideo': 'avi',
  'video/mpeg': 'mpeg',
})

// Enough bytes for every signature checked below.
export const videoHeaderBytes = 16

const ebmlSignature = Buffer.from([0x1a, 0x45, 0xdf, 0xa3])

/**
 * Maps a container signature to the declared MIME types it may legitimately
 * carry. Several containers share one signature — ISO-BMFF `ftyp` backs both
 * MP4 and QuickTime, and EBML backs both WebM and Matroska — so detection
 * yields a family rather than a single type.
 *
 * This is a consistency guard against a mislabelled upload, not a sandbox:
 * uploaded bytes are only ever streamed to storage and served back, never
 * executed or decoded on the server.
 */
export function detectVideoContainerTypes(header) {
  if (header.length >= 12 && header.subarray(4, 8).toString('latin1') === 'ftyp') {
    return ['video/mp4', 'video/quicktime']
  }
  if (header.length >= 4 && header.subarray(0, 4).equals(ebmlSignature)) {
    return ['video/webm', 'video/x-matroska']
  }
  if (
    header.length >= 12 &&
    header.subarray(0, 4).toString('latin1') === 'RIFF' &&
    header.subarray(8, 12).toString('latin1') === 'AVI '
  ) {
    return ['video/x-msvideo']
  }
  // MPEG program/system stream: 0x000001 followed by a start code in 0xB0-0xBF.
  if (
    header.length >= 4 &&
    header[0] === 0x00 &&
    header[1] === 0x00 &&
    header[2] === 0x01 &&
    header[3] >= 0xb0 &&
    header[3] <= 0xbf
  ) {
    return ['video/mpeg']
  }
  return []
}

function videoError(code, message, statusCode = 400) {
  const error = new Error(message)
  error.code = code
  error.statusCode = statusCode
  return error
}

export function createPropertyVideoValidator() {
  return {
    /**
     * Validates an upload that already lives on disk. Only the header is read
     * into memory, so a multi-gigabyte file is never buffered.
     */
    validate({ header, mimeType, sizeBytes } = {}) {
      if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || !header?.length) {
        throw videoError('VIDEO_REQUIRED', 'Exactly one video is required.')
      }
      if (sizeBytes > maximumVideoBytes) {
        throw videoError('VIDEO_TOO_LARGE', 'The video exceeds 4 GB.', 413)
      }
      if (!videoExtensions[mimeType]) {
        throw videoError(
          'INVALID_VIDEO_TYPE',
          'This video format is not supported.',
        )
      }
      if (!detectVideoContainerTypes(header).includes(mimeType)) {
        throw videoError(
          'INVALID_VIDEO_TYPE',
          'The video type or signature is not supported.',
        )
      }

      return {
        extension: videoExtensions[mimeType],
        mimeType,
        sizeBytes,
      }
    },
  }
}

const propertyVideoValidator = createPropertyVideoValidator()

export default propertyVideoValidator
