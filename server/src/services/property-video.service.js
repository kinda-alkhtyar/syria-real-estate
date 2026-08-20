import { randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { open } from 'node:fs/promises'

import { propertyVideoStorage } from '../adapters/property-image-storage.adapter.js'
import { removeTemporaryUpload } from '../middleware/property-video-upload.middleware.js'
import {
  attachPropertyVideo,
  clearPropertyVideo,
  findPropertyOwnership,
  findPropertyVideo,
} from '../repositories/property.repository.js'
import propertyVideoValidator, {
  videoHeaderBytes,
} from '../utils/property-video.js'
import propertyMediaUrls from './property-media-url.service.js'

async function readHeader(filePath, byteCount) {
  const handle = await open(filePath, 'r')
  try {
    const buffer = Buffer.alloc(byteCount)
    const { bytesRead } = await handle.read(buffer, 0, byteCount, 0)
    return buffer.subarray(0, bytesRead)
  } finally {
    await handle.close()
  }
}

function videoError(code, message, statusCode) {
  const error = new Error(message)
  error.code = code
  error.statusCode = statusCode
  return error
}

export function createPropertyVideoService({
  createId = randomUUID,
  loadHeader = readHeader,
  openReadStream = createReadStream,
  removeUpload = removeTemporaryUpload,
  repository = {
    attachPropertyVideo,
    clearPropertyVideo,
    findPropertyOwnership,
    findPropertyVideo,
  },
  mediaUrls = propertyMediaUrls,
  storage = propertyVideoStorage,
  validator = propertyVideoValidator,
} = {}) {
  async function authorizeProperty(propertyId, actor) {
    const property = await repository.findPropertyOwnership(propertyId)
    if (!property) {
      throw videoError(
        'PROPERTY_NOT_FOUND',
        'The requested property was not found.',
        404,
      )
    }
    if (actor.role !== 'ADMIN' && property.ownerId !== actor.id) {
      throw videoError(
        'FORBIDDEN',
        'You are not allowed to manage the video for this property.',
        403,
      )
    }
    return property
  }

  function videoExistsError() {
    return videoError(
      'VIDEO_ALREADY_EXISTS',
      'A property may have only one video. Delete the current video first.',
      409,
    )
  }

  async function compensateUpload(storagePath) {
    try {
      await storage.remove(storagePath)
    } catch {
      throw videoError(
        'VIDEO_COMPENSATION_FAILED',
        'The video operation could not be completed safely.',
        500,
      )
    }
  }

  return {
    authorizeProperty,

    async uploadVideo(propertyId, file, actor) {
      // The upload already sits in a temp file; it is removed on every path.
      try {
        const property = await authorizeProperty(propertyId, actor)

        const existing = await repository.findPropertyVideo(propertyId)
        if (existing?.videoStoragePath) throw videoExistsError()

        const video = validator.validate({
          header: await loadHeader(file.path, videoHeaderBytes),
          mimeType: file.mimetype,
          sizeBytes: file.size,
        })

        const storagePath = `properties/${propertyId}/videos/${createId()}.${video.extension}`
        // Streamed so a multi-gigabyte file never lands in process memory.
        const { url } = await storage.upload(
          storagePath,
          openReadStream(file.path),
          { contentType: video.mimeType },
        )

        let attached
        try {
          attached = await repository.attachPropertyVideo(propertyId, {
            videoUrl: url,
            videoStoragePath: storagePath,
            videoMimeType: video.mimeType,
            videoSizeBytes: BigInt(video.sizeBytes),
          })
        } catch (error) {
          await compensateUpload(storagePath)
          throw error
        }
        if (attached === 0) {
          await compensateUpload(storagePath)
          throw videoExistsError()
        }

        return {
          // A listing a visitor cannot open yet answers with a URL that
          // expires instead of the permanent public link to the object.
          url: await mediaUrls.forVideo(property.status, {
            videoUrl: url,
            videoStoragePath: storagePath,
          }),
          mimeType: video.mimeType,
          sizeBytes: Number(video.sizeBytes),
        }
      } finally {
        await removeUpload(file?.path)
      }
    },

    async deleteVideo(propertyId, actor) {
      await authorizeProperty(propertyId, actor)

      const existing = await repository.findPropertyVideo(propertyId)
      if (!existing?.videoStoragePath) {
        throw videoError(
          'VIDEO_NOT_FOUND',
          'This property has no video.',
          404,
        )
      }

      const cleared = await repository.clearPropertyVideo(propertyId)
      if (cleared === 0) {
        throw videoError(
          'VIDEO_NOT_FOUND',
          'This property has no video.',
          404,
        )
      }

      // The row is detached first so a storage failure can only leave an
      // orphaned object, never a property pointing at a deleted file.
      try {
        await storage.remove(existing.videoStoragePath)
      } catch {
        // Intentionally ignored: the video is already removed from the listing.
      }
    },
  }
}

const propertyVideoService = createPropertyVideoService()

export default propertyVideoService
