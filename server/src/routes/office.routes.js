import { Router } from 'express'

import { createOfficeController } from '../controllers/office.controller.js'
import {
  requireAuthentication,
  requireRole,
} from '../middleware/authentication.middleware.js'
import noStoreMiddleware from '../middleware/no-store.middleware.js'
import { requireAllowedOrigin } from '../middleware/origin.middleware.js'
import { createPublicReadCache } from '../middleware/public-read-cache.middleware.js'
import {
  createManagementReadRateLimiter,
  createPropertyWriteRateLimiter,
} from '../middleware/rate-limit.middleware.js'
import officeService from '../services/office.service.js'

const requireOfficeManager = requireRole('OWNER', 'ADMIN')

export function createOfficeRouter({
  service = officeService,
  controller = createOfficeController({ service }),
  authenticationMiddleware = requireAuthentication,
  roleMiddleware = requireOfficeManager,
  originMiddleware = requireAllowedOrigin,
  writeRateLimitMiddleware = createPropertyWriteRateLimiter(),
  readCacheMiddleware = createPublicReadCache(),
  ownerReadRateLimitMiddleware = createManagementReadRateLimiter(),
} = {}) {
  const router = Router()

  // Registered ahead of the shared read cache and of `/:id`: this answer is
  // scoped to one signed-in owner, so it must never be cached and must never
  // be read as an office identifier.
  router.get(
    '/mine',
    ownerReadRateLimitMiddleware,
    noStoreMiddleware,
    authenticationMiddleware,
    roleMiddleware,
    controller.mine,
  )

  // Both public reads are identical for every visitor; the cache clears itself
  // after any successful write on this router.
  router.use(readCacheMiddleware)
  router.get('/', controller.list)
  router.post(
    '/',
    writeRateLimitMiddleware,
    originMiddleware,
    authenticationMiddleware,
    roleMiddleware,
    controller.create,
  )
  router.patch(
    '/:id',
    writeRateLimitMiddleware,
    originMiddleware,
    authenticationMiddleware,
    roleMiddleware,
    controller.update,
  )
  // Registered under the read cache like every other write on this router, so
  // a successful delete clears the public list and detail entries instead of
  // leaving a closed office readable for the rest of the TTL.
  router.delete(
    '/:id',
    writeRateLimitMiddleware,
    originMiddleware,
    authenticationMiddleware,
    roleMiddleware,
    controller.remove,
  )
  router.get('/:id', controller.detail)

  return router
}

const officeRouter = createOfficeRouter()

export default officeRouter
