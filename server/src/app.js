import compression from 'compression'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'

import env from './config/env.js'
import { getReadiness } from './controllers/health.controller.js'
import errorMiddleware from './middleware/error.middleware.js'
import noStoreMiddleware from './middleware/no-store.middleware.js'
import notFoundMiddleware from './middleware/not-found.middleware.js'
import { createGeneralApiRateLimiter } from './middleware/rate-limit.middleware.js'
import requestIdMiddleware from './middleware/request-id.middleware.js'
import requestObservability, {
  createRouteContext,
} from './middleware/request-observability.middleware.js'
import authRouter from './routes/auth.routes.js'
import healthRouter from './routes/health.routes.js'
import managementRouter from './routes/management.routes.js'
import metricsRouter from './routes/metrics.routes.js'
import officeRouter from './routes/office.routes.js'
import propertyRouter from './routes/property.routes.js'
import userRouter from './routes/user.routes.js'

const app = express()

const corsOptions = {
  origin(origin, callback) {
    if (!origin || env.corsOrigins.includes(origin)) {
      callback(null, true)
      return
    }

    const error = new Error('The request origin is not allowed.')
    error.code = 'CORS_ORIGIN_DENIED'
    error.statusCode = 403
    callback(error)
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID'],
  credentials: true,
}

app.disable('x-powered-by')
// Client IPs drive rate limiting, so X-Forwarded-For is only honoured when the
// deployment declares how many proxies sit in front of this process.
app.set('trust proxy', env.trustProxy)
app.use(
  helmet({
    // This API is never framed, so the stricter action is the correct one.
    frameguard: { action: 'deny' },
    // HSTS is meaningless over the plain HTTP a local run serves, and a
    // browser would keep the pin long after the session ended.
    hsts: env.nodeEnv === 'production',
  }),
)
// Helmet ships no Permissions-Policy. A JSON API needs none of these device
// features, and denying them here also covers any error page it returns.
app.use(function permissionsPolicyMiddleware(_request, response, next) {
  response.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  next()
})
app.use(requestIdMiddleware)
app.use(requestObservability)
app.use(cors(corsOptions))
app.use(compression())
app.use(express.json({ limit: '1mb' }))

// A cached probe answer would report the state of whichever instance replied
// first, minutes ago, which is the one thing a probe must never do.
app.use('/health', createRouteContext('/health'), noStoreMiddleware, healthRouter)
app.get('/ready', noStoreMiddleware, getReadiness)
app.use('/metrics', createRouteContext('/metrics'), metricsRouter)

// Applied to the API only: liveness and readiness probes must never be
// throttled, and stricter per-operation limits are layered inside the routers.
app.use('/api/v1', createGeneralApiRateLimiter())

app.use('/api/v1/auth', createRouteContext('/api/v1/auth'), authRouter)
app.use(
  '/api/v1/management',
  createRouteContext('/api/v1/management'),
  managementRouter,
)
app.use(
  '/api/v1/offices',
  createRouteContext('/api/v1/offices'),
  officeRouter,
)
app.use(
  '/api/v1/properties',
  createRouteContext('/api/v1/properties'),
  propertyRouter,
)

app.use('/api/v1/users', createRouteContext('/api/v1/users'), userRouter)

app.use(notFoundMiddleware)
app.use(errorMiddleware)

export default app
