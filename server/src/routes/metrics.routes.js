import { Router } from 'express'

import { getMetrics } from '../controllers/metrics.controller.js'
import {
  requireAuthentication,
  requireRole,
} from '../middleware/authentication.middleware.js'

const metricsRouter = Router()

// The snapshot describes internal traffic, failures, and cache behaviour, so
// it is reserved for administrators through the session cookie the rest of the
// API already uses — no separate credential is introduced.
metricsRouter.get('/', requireAuthentication, requireRole('ADMIN'), getMetrics)

export default metricsRouter
