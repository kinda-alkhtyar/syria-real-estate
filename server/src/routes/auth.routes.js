import { Router } from 'express'

import { createAuthController } from '../controllers/auth.controller.js'
import {
  createRequireAuthentication,
  requireRole,
} from '../middleware/authentication.middleware.js'
import {
  accountLoginRateLimitMiddleware,
  createAccountLoginRateLimiter,
  createLoginRateLimiter,
  loginRateLimiter,
} from '../middleware/login-rate-limit.middleware.js'
import noStoreMiddleware from '../middleware/no-store.middleware.js'
import {
  createRequireAllowedOrigin,
  requireAllowedOrigin,
} from '../middleware/origin.middleware.js'
import authenticationService from '../services/authentication.service.js'
import authCookieManager from '../utils/auth-cookie.js'

export function createAuthRouter({
  service = authenticationService,
  cookieManager = authCookieManager,
  originMiddleware = requireAllowedOrigin,
  rateLimitMiddleware = loginRateLimiter,
  accountRateLimitMiddleware = accountLoginRateLimitMiddleware,
} = {}) {
  const router = Router()
  const controller = createAuthController({ service, cookieManager })
  const authenticate = createRequireAuthentication({
    service,
    cookieManager,
  })

  router.use(noStoreMiddleware)
  router.post(
    '/login',
    originMiddleware,
    rateLimitMiddleware,
    accountRateLimitMiddleware,
    controller.login,
  )
  router.post(
    '/google',
    originMiddleware,
    rateLimitMiddleware,
    controller.googleLogin,
  )
  router.post('/logout', originMiddleware, controller.logout)
  router.get('/me', authenticate, controller.me)

  return router
}

const authRouter = createAuthRouter()

export {
  createAccountLoginRateLimiter,
  createLoginRateLimiter,
  createRequireAllowedOrigin,
  requireRole,
}
export default authRouter
