import { Router } from 'express'

import { createUserController } from '../controllers/user.controller.js'
import { requireAuthentication } from '../middleware/authentication.middleware.js'
import noStoreMiddleware from '../middleware/no-store.middleware.js'
import { requireAllowedOrigin } from '../middleware/origin.middleware.js'
import {
  createPasswordChangeRateLimiter,
  createPropertyWriteRateLimiter,
} from '../middleware/rate-limit.middleware.js'
import userService from '../services/user.service.js'

export function createUserRouter({
  service = userService,
  controller = createUserController({ service }),
  authenticationMiddleware = requireAuthentication,
  originMiddleware = requireAllowedOrigin,
  writeRateLimitMiddleware = createPropertyWriteRateLimiter(),
  passwordRateLimitMiddleware = createPasswordChangeRateLimiter(),
} = {}) {
  const router = Router()

  // Every answer here is scoped to one signed-in account, so none of it may be
  // cached by a browser or an intermediary. No role guard is applied: these are
  // self-service routes, open to any authenticated role.
  router.use(noStoreMiddleware)

  router.get('/me', authenticationMiddleware, controller.me)
  router.patch(
    '/me',
    writeRateLimitMiddleware,
    originMiddleware,
    authenticationMiddleware,
    controller.updateMe,
  )
  router.post(
    '/me/password',
    passwordRateLimitMiddleware,
    originMiddleware,
    authenticationMiddleware,
    controller.changePassword,
  )

  return router
}

const userRouter = createUserRouter()

export default userRouter
