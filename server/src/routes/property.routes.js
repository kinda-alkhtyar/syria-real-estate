import { Router } from 'express'

import {
  createPropertyManagementController,
  getProperties,
  getPropertyBySlug,
} from '../controllers/property.controller.js'
import { createPropertyImageController } from '../controllers/property-image.controller.js'
import { createPropertyVideoController } from '../controllers/property-video.controller.js'
import {
  requireAuthentication,
  requireRole,
} from '../middleware/authentication.middleware.js'
import { requireAllowedOrigin } from '../middleware/origin.middleware.js'
import { parsePropertyImageUpload } from '../middleware/property-image-upload.middleware.js'
import { parsePropertyVideoUpload } from '../middleware/property-video-upload.middleware.js'
import { createPublicReadCache } from '../middleware/public-read-cache.middleware.js'
import {
  createImageUploadRateLimiter,
  createPropertyWriteRateLimiter,
} from '../middleware/rate-limit.middleware.js'
import propertyImageService from '../services/property-image.service.js'
import propertyManagementService from '../services/property.service.js'
import propertyVideoService from '../services/property-video.service.js'

const requirePropertyManager = requireRole('OWNER', 'ADMIN')

export function createPropertyRouter({
  managementService = propertyManagementService,
  imageService = propertyImageService,
  imageUploadMiddleware = parsePropertyImageUpload,
  videoService = propertyVideoService,
  videoUploadMiddleware = parsePropertyVideoUpload,
  authenticationMiddleware = requireAuthentication,
  roleMiddleware = requirePropertyManager,
  originMiddleware = requireAllowedOrigin,
  writeRateLimitMiddleware = createPropertyWriteRateLimiter(),
  imageUploadRateLimitMiddleware = createImageUploadRateLimiter(),
} = {}) {
  const router = Router()
  const controller = createPropertyManagementController({
    service: managementService,
  })
  const imageController = createPropertyImageController({
    service: imageService,
  })
  const videoController = createPropertyVideoController({
    service: videoService,
  })

  router.use(createPublicReadCache())
  router.get('/', getProperties)
  router.post(
    '/',
    writeRateLimitMiddleware,
    originMiddleware,
    authenticationMiddleware,
    roleMiddleware,
    controller.create,
  )
  router.post(
    '/:propertyId/images',
    imageUploadRateLimitMiddleware,
    originMiddleware,
    authenticationMiddleware,
    roleMiddleware,
    imageController.authorizeProperty,
    imageUploadMiddleware,
    imageController.upload,
  )
  router.patch(
    '/:propertyId/images/order',
    writeRateLimitMiddleware,
    originMiddleware,
    authenticationMiddleware,
    roleMiddleware,
    imageController.authorizeProperty,
    imageController.reorder,
  )
  router.patch(
    '/:propertyId/images/:imageId/primary',
    writeRateLimitMiddleware,
    originMiddleware,
    authenticationMiddleware,
    roleMiddleware,
    imageController.authorizeProperty,
    imageController.setPrimary,
  )
  router.delete(
    '/:propertyId/images/:imageId',
    writeRateLimitMiddleware,
    originMiddleware,
    authenticationMiddleware,
    roleMiddleware,
    imageController.authorizeProperty,
    imageController.remove,
  )
  router.post(
    '/:propertyId/video',
    imageUploadRateLimitMiddleware,
    originMiddleware,
    authenticationMiddleware,
    roleMiddleware,
    videoController.authorizeProperty,
    videoUploadMiddleware,
    videoController.upload,
  )
  router.delete(
    '/:propertyId/video',
    writeRateLimitMiddleware,
    originMiddleware,
    authenticationMiddleware,
    roleMiddleware,
    videoController.authorizeProperty,
    videoController.remove,
  )
  router.patch(
    '/:id/archive',
    writeRateLimitMiddleware,
    originMiddleware,
    authenticationMiddleware,
    roleMiddleware,
    controller.archive,
  )
  router.patch(
    '/:id/restore',
    writeRateLimitMiddleware,
    originMiddleware,
    authenticationMiddleware,
    roleMiddleware,
    controller.restore,
  )
  router.patch(
    '/:id',
    writeRateLimitMiddleware,
    originMiddleware,
    authenticationMiddleware,
    roleMiddleware,
    controller.update,
  )
  router.get('/:slug', getPropertyBySlug)

  return router
}

const propertyRouter = createPropertyRouter()

export default propertyRouter
