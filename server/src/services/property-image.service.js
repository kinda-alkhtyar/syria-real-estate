import { randomUUID } from 'node:crypto'

import propertyImageStorage from '../adapters/property-image-storage.adapter.js'
import propertyImageRepository from '../repositories/property-image.repository.js'
import {
  findPropertyOwnership,
} from '../repositories/property.repository.js'
import propertyImageProcessor, {
  maximumImageBytes,
  maximumImagesPerProperty,
} from '../utils/property-image.js'
import propertyMediaUrls from './property-media-url.service.js'

function imageError(code, message, statusCode) {
  const error = new Error(message)
  error.code = code
  error.statusCode = statusCode
  return error
}

function serializeImage(image) {
  return {
    id: image.id,
    url: image.url,
    altEn: image.altEn,
    altAr: image.altAr,
    altDe: image.altDe,
    sortOrder: image.sortOrder,
    mimeType: image.mimeType,
    sizeBytes: image.sizeBytes,
    width: image.width,
    height: image.height,
    createdAt: image.createdAt,
  }
}

export function createPropertyImageService({
  propertyRepository = { findPropertyOwnership },
  imageRepository = propertyImageRepository,
  storage = propertyImageStorage,
  processor = propertyImageProcessor,
  mediaUrls = propertyMediaUrls,
  createId = randomUUID,
} = {}) {
  async function authorizeProperty(propertyId, actor) {
    const property = await propertyRepository.findPropertyOwnership(propertyId)
    if (!property) {
      throw imageError(
        'PROPERTY_NOT_FOUND',
        'The requested property was not found.',
        404,
      )
    }
    if (actor.role !== 'ADMIN' && property.ownerId !== actor.id) {
      throw imageError(
        'FORBIDDEN',
        'You are not allowed to manage images for this property.',
        403,
      )
    }
    return property
  }

  /**
   * The stored `url` is the permanent public link to the object. It is only
   * handed out for a listing a visitor could already open; for anything else —
   * a draft, a submission under review, a rejected listing — the media service
   * answers with a URL that expires.
   */
  async function serializeImages(status, images) {
    const urls = await mediaUrls.forImages(status, images)
    return images.map((image, index) => ({
      ...serializeImage(image),
      url: urls[index],
    }))
  }

  async function compensateUpload(storagePath) {
    try {
      await storage.remove(storagePath)
    } catch {
      throw imageError(
        'IMAGE_COMPENSATION_FAILED',
        'The image operation could not be completed safely.',
        500,
      )
    }
  }

  async function reorder(propertyId, imageIds, actor) {
    const property = await authorizeProperty(propertyId, actor)
    const result = await imageRepository.reorder(propertyId, imageIds)
    if (result.invalidSet) {
      throw imageError(
        'INVALID_IMAGE_ORDER',
        'The complete ordered image set is required.',
        400,
      )
    }
    return serializeImages(property.status, result.images)
  }

  return {
    authorizeProperty,

    async uploadImage(propertyId, file, altText, actor) {
      const property = await authorizeProperty(propertyId, actor)
      if (
        (await imageRepository.countPropertyImages(propertyId)) >=
        maximumImagesPerProperty
      ) {
        throw imageError(
          'IMAGE_LIMIT_REACHED',
          'A property may have at most 20 images.',
          409,
        )
      }

      const processed = await processor.process(file)
      const storagePath = `properties/${propertyId}/${createId()}.webp`
      const { url } = await storage.upload(storagePath, processed.buffer)

      let result
      try {
        result = await imageRepository.createWithinLimit(
          {
            propertyId,
            url,
            storagePath,
            mimeType: processed.mimeType,
            sizeBytes: processed.sizeBytes,
            width: processed.width,
            height: processed.height,
            ...altText,
          },
          maximumImagesPerProperty,
        )
      } catch (error) {
        await compensateUpload(storagePath)
        throw error
      }
      if (result.limitReached) {
        await compensateUpload(storagePath)
        throw imageError(
          'IMAGE_LIMIT_REACHED',
          'A property may have at most 20 images.',
          409,
        )
      }
      const [image] = await serializeImages(property.status, [result.image])
      return image
    },

    reorderImages(propertyId, imageIds, actor) {
      return reorder(propertyId, imageIds, actor)
    },

    async setPrimaryImage(propertyId, imageId, actor) {
      const property = await authorizeProperty(propertyId, actor)
      const images = await imageRepository.listImages(propertyId)
      if (!images.some(({ id }) => id === imageId)) {
        throw imageError(
          'PROPERTY_IMAGE_NOT_FOUND',
          'The requested property image was not found.',
          404,
        )
      }
      const orderedIds = [
        imageId,
        ...images.filter(({ id }) => id !== imageId).map(({ id }) => id),
      ]
      const result = await imageRepository.reorder(propertyId, orderedIds)
      if (result.invalidSet) {
        throw imageError(
          'IMAGE_ORDER_CONFLICT',
          'The property image order changed. Retry the request.',
          409,
        )
      }
      return serializeImages(property.status, result.images)
    },

    async deleteImage(propertyId, imageId, actor) {
      await authorizeProperty(propertyId, actor)
      const image = await imageRepository.findImage(propertyId, imageId)
      if (!image) {
        throw imageError(
          'PROPERTY_IMAGE_NOT_FOUND',
          'The requested property image was not found.',
          404,
        )
      }
      if (!image.storagePath) {
        throw imageError(
          'IMAGE_NOT_STORAGE_MANAGED',
          'This legacy image is not managed by Storage.',
          409,
        )
      }

      const backup = await storage.download(image.storagePath)
      if (backup.length > maximumImageBytes) {
        throw imageError(
          'STORAGE_OBJECT_TOO_LARGE',
          'The stored image could not be removed safely.',
          500,
        )
      }
      await storage.remove(image.storagePath)

      try {
        const result = await imageRepository.deleteAndCompact(
          propertyId,
          imageId,
        )
        if (!result.deleted) {
          throw imageError(
            'PROPERTY_IMAGE_NOT_FOUND',
            'The requested property image was not found.',
            404,
          )
        }
      } catch (error) {
        try {
          await storage.upload(image.storagePath, backup)
        } catch {
          throw imageError(
            'IMAGE_COMPENSATION_FAILED',
            'The image operation could not be completed safely.',
            500,
          )
        }
        throw error
      }
    },
  }
}

const propertyImageService = createPropertyImageService()

export default propertyImageService
