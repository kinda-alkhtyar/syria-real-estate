import { Router } from 'express'

import { getMetrics } from '../controllers/metrics.controller.js'
import {
  requireAuthentication,
  requireRole,
} from '../middleware/authentication.middleware.js'
import noStoreMiddleware from '../middleware/no-store.middleware.js'

const metricsRouter = Router()

// The snapshot describes internal traffic, failures, and cache behaviour, so
// it is reserved for administrators through the session cookie the rest of the
// API already uses — no separate credential is introduced, and no cache is
// allowed to keep a copy of the snapshot it returns.
metricsRouter.get(
  '/',
  noStoreMiddleware,
  requireAuthentication,
  requireRole('ADMIN'),
  getMetrics,
)

export default metricsRouter
