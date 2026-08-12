import { Router } from 'express'

import propertyManagementListController, {
  createPropertyManagementListController,
} from '../controllers/property-management.controller.js'
import propertyModerationController from '../controllers/property.controller.js'
import {
  requireAuthentication,
  requireRole,
} from '../middleware/authentication.middleware.js'
import noStoreMiddleware from '../middleware/no-store.middleware.js'
import { requireAllowedOrigin } from '../middleware/origin.middleware.js'
import {
  createManagementReadRateLimiter,
  createPropertyWriteRateLimiter,
} from '../middleware/rate-limit.middleware.js'

const requirePropertyManager = requireRole('OWNER', 'ADMIN')
const requireAdministrator = requireRole('ADMIN')

export function createManagementRouter({
  controller = propertyManagementListController,
  moderationController = propertyModerationController,
  authenticationMiddleware = requireAuthentication,
  roleMiddleware = requirePropertyManager,
  // Approving and rejecting are the moderator's own decisions, so an OWNER is
  // turned away here even though they may read this router's list.
  moderationRoleMiddleware = requireAdministrator,
  originMiddleware = requireAllowedOrigin,
  readRateLimitMiddleware = createManagementReadRateLimiter(),
  writeRateLimitMiddleware = createPropertyWriteRateLimiter(),
} = {}) {
  const router = Router()

  // Every response here is scoped to one dashboard user.
  router.use(noStoreMiddleware)

  // Throttled ahead of authentication so an unauthenticated flood is turned
  // away before it costs a session lookup.
  router.get(
    '/properties',
    readRateLimitMiddleware,
    authenticationMiddleware,
    roleMiddleware,
    controller.list,
  )

  router.post(
    '/properties/:id/approve',
    writeRateLimitMiddleware,
    originMiddleware,
    authenticationMiddleware,
    moderationRoleMiddleware,
    moderationController.approve,
  )

  router.post(
    '/properties/:id/reject',
    writeRateLimitMiddleware,
    originMiddleware,
    authenticationMiddleware,
    moderationRoleMiddleware,
    moderationController.reject,
  )

  // Deleting is not moderation: it takes the shared OWNER/ADMIN gate, and the
  // service decides from there whether this caller owns the listing.
  router.delete(
    '/properties/:id',
    writeRateLimitMiddleware,
    originMiddleware,
    authenticationMiddleware,
    roleMiddleware,
    moderationController.remove,
  )

  return router
}

export { createPropertyManagementListController }

const managementRouter = createManagementRouter()

export default managementRouter
