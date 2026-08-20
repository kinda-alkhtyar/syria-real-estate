import propertyImageStorage, {
  propertyVideoStorage,
} from '../adapters/property-image-storage.adapter.js'
import logger from '../observability/logger.js'
import { publicPropertyStatuses } from '../validation/property.schema.js'

const publicStatusSet = new Set(publicPropertyStatuses)

// Long enough to fill a dashboard page, open an image, and come back to it,
// short enough that a link copied out of a browser history or an admin panel
// stops working the same working session.
export const imageSignedUrlSeconds = 60 * 60

// Half of that: a video URL is handed to a player that keeps requesting ranges
// for as long as it plays, but nobody reviews one listing for half an hour.
export const videoSignedUrlSeconds = 30 * 60

/**
 * Whether a listing at this status is one a visitor can reach. Anything else —
 * a draft, a submission under review, a rejected or archived listing — is
 * private to its owner and to the moderators.
 *
 * An unknown or missing status is treated as private on purpose: a listing
 * whose status this module does not recognise is the last thing that should be
 * handed a permanent public link.
 */
export function isPubliclyVisible(status) {
  return publicStatusSet.has(status)
}

export function createPropertyMediaUrls({
  imageStorage = propertyImageStorage,
  videoStorage = propertyVideoStorage,
  log = logger,
} = {}) {
  /**
   * Signing is best effort. Storage being unreachable degrades a dashboard to
   * listings without thumbnails; it must never turn one into an error page, and
   * it must never fall back to the permanent public URL, which is the very link
   * this module exists to withhold.
   */
  async function sign(storage, paths, expiresInSeconds) {
    if (paths.length === 0) return new Map()
    try {
      return await storage.createSignedUrls(paths, expiresInSeconds)
    } catch {
      log.error('media_url_signing_failed', {
        component: 'property-media-url',
        code: 'STORAGE_OPERATION_FAILED',
      })
      return new Map()
    }
  }

  function imageUrl(status, image, signed) {
    // A listing anybody can open is served from the permanent public URL, so
    // its images stay cacheable by the CDN under a stable key.
    if (isPubliclyVisible(status)) return image.url
    // A row without a storage path predates Storage or points somewhere else
    // entirely; there is nothing for this service to sign.
    if (!image.storagePath) return image.url
    return signed.get(image.storagePath) ?? null
  }

  function videoUrl(status, property, signed) {
    if (isPubliclyVisible(status)) return property.videoUrl ?? null
    if (!property.videoStoragePath) return property.videoUrl ?? null
    return signed.get(property.videoStoragePath) ?? null
  }

  return {
    /**
     * The URLs for one listing's images, positionally aligned with the images
     * passed in. A null entry means the URL could not be produced and the
     * caller should render the image as missing.
     */
    async forImages(status, images = []) {
      const signed = isPubliclyVisible(status)
        ? new Map()
        : await sign(
            imageStorage,
            images.map(({ storagePath }) => storagePath).filter(Boolean),
            imageSignedUrlSeconds,
          )

      return images.map((image) => imageUrl(status, image, signed))
    },

    async forVideo(status, property) {
      const signed =
        isPubliclyVisible(status) || !property?.videoStoragePath
          ? new Map()
          : await sign(
              videoStorage,
              [property.videoStoragePath],
              videoSignedUrlSeconds,
            )

      return videoUrl(status, property ?? {}, signed)
    },

    /**
     * The same decision for a whole page of listings, in at most one call per
     * bucket however many listings the page holds.
     */
    async forProperties(properties = []) {
      const imagePaths = []
      const videoPaths = []
      for (const property of properties) {
        if (isPubliclyVisible(property.status)) continue
        for (const image of property.images ?? []) {
          if (image.storagePath) imagePaths.push(image.storagePath)
        }
        if (property.videoStoragePath) videoPaths.push(property.videoStoragePath)
      }

      const [signedImages, signedVideos] = await Promise.all([
        sign(imageStorage, imagePaths, imageSignedUrlSeconds),
        sign(videoStorage, videoPaths, videoSignedUrlSeconds),
      ])

      return {
        imageUrl(status, image) {
          return imageUrl(status, image, signedImages)
        },
        videoUrl(status, property) {
          return videoUrl(status, property, signedVideos)
        },
      }
    },
  }
}

const propertyMediaUrls = createPropertyMediaUrls()

export default propertyMediaUrls
