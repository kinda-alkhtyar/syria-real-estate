import { Router } from 'express'

import propertyManagementListController, {
  createPropertyManagementListController,
} from '../controllers/property-management.controller.js'
import {
  requireAuthentication,
  requireRole,
} from '../middleware/authentication.middleware.js'
import { createManagementReadRateLimiter } from '../middleware/rate-limit.middleware.js'

const requirePropertyManager = requireRole('OWNER', 'ADMIN')

export function createManagementRouter({
  controller = propertyManagementListController,
  authenticationMiddleware = requireAuthentication,
  roleMiddleware = requirePropertyManager,
  readRateLimitMiddleware = createManagementReadRateLimiter(),
} = {}) {
  const router = Router()

  // Throttled ahead of authentication so an unauthenticated flood is turned
  // away before it costs a session lookup.
  router.get(
    '/properties',
    readRateLimitMiddleware,
    authenticationMiddleware,
    roleMiddleware,
    controller.list,
  )

  return router
}

export { createPropertyManagementListController }

const managementRouter = createManagementRouter()

export default managementRouter
