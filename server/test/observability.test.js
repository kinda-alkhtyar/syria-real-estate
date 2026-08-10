import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { test } from 'node:test'

import { createHealthController } from '../src/controllers/health.controller.js'
import { createErrorMiddleware } from '../src/middleware/error.middleware.js'
import { createRequestIdMiddleware } from '../src/middleware/request-id.middleware.js'
import { createRequestObservability } from '../src/middleware/request-observability.middleware.js'
import { createApplicationLifecycle } from '../src/observability/lifecycle.js'
import { createLogger } from '../src/observability/logger.js'
import { createOperationalMetrics } from '../src/observability/metrics.js'
import { createGracefulShutdown } from '../src/utils/graceful-shutdown.js'

function createResponse() {
  const response = new EventEmitter()
  response.body = null
  response.headers = {}
  response.headersSent = false
  response.statusCode = 200
  response.json = function json(body) {
    this.body = body
    return this
  }
  response.set = function set(name, value) {
    this.headers[name] = value
    return this
  }
  response.status = function status(statusCode) {
    this.statusCode = statusCode
    return this
  }
  return response
}

test('accepts safe request IDs, generates replacements, and returns the header', () => {
  const middleware = createRequestIdMiddleware({
    createId: () => 'generated-request-id',
  })
  const acceptedRequest = {
    get: () => 'client_request_123',
  }
  const acceptedResponse = createResponse()
  middleware(acceptedRequest, acceptedResponse, () => {})

  assert.equal(acceptedRequest.id, 'client_request_123')
  assert.equal(
    acceptedResponse.headers['X-Request-ID'],
    'client_request_123',
  )

  const replacedRequest = { get: () => 'Bearer secret-token' }
  const replacedResponse = createResponse()
  middleware(replacedRequest, replacedResponse, () => {})
  assert.equal(replacedRequest.id, 'generated-request-id')
  assert.equal(
    replacedResponse.headers['X-Request-ID'],
    'generated-request-id',
  )
})

test('writes structured production logs using only allowlisted safe fields', () => {
  const output = []
  const logger = createLogger({
    nodeEnv: 'production',
    now: () => new Date('2026-08-01T12:00:00.000Z'),
    sink: {
      error: (line) => output.push(line),
      log: (line) => output.push(line),
    },
  })
  logger.error('request_failed', {
    category: 'internal',
    code: 'INTERNAL_SERVER_ERROR',
    cookie: 'session=secret',
    databaseUrl: 'postgresql://secret',
    message: 'password=secret',
    requestId: 'request_123',
    status: 500,
    token: 'secret-token',
  })

  assert.equal(output.length, 1)
  const entry = JSON.parse(output[0])
  assert.deepEqual(entry, {
    timestamp: '2026-08-01T12:00:00.000Z',
    level: 'error',
    event: 'request_failed',
    category: 'internal',
    code: 'INTERNAL_SERVER_ERROR',
    requestId: 'request_123',
    status: 500,
  })
  assert.doesNotMatch(output[0], /secret|password|postgresql/i)
})

test('records request latency and emits a correlated route-template log', () => {
  const entries = []
  const metrics = createOperationalMetrics({ now: () => 0 })
  const times = [1_000_000_000n, 1_012_500_000n]
  const middleware = createRequestObservability({
    log: { info: (event, fields) => entries.push({ event, fields }) },
    metrics,
    now: () => times.shift(),
  })
  const request = {
    id: 'request_123',
    method: 'GET',
    observabilityBase: '/api/v1/properties',
    route: { path: '/:slug' },
  }
  const response = createResponse()
  response.statusCode = 200

  middleware(request, response, () => {})
  response.emit('finish')

  assert.deepEqual(entries, [
    {
      event: 'request_completed',
      fields: {
        durationMs: 12.5,
        method: 'GET',
        requestId: 'request_123',
        route: '/api/v1/properties/:slug',
        status: 200,
      },
    },
  ])
  assert.equal(metrics.snapshot().requests.averageLatencyMs, 12.5)
})

test('collects bounded operational counters without personal labels', () => {
  let currentTime = 1_000
  const metrics = createOperationalMetrics({ now: () => currentTime })
  metrics.recordRequest({ durationMs: 10, statusCode: 200 })
  metrics.recordRequest({ durationMs: 30, statusCode: 503 })
  metrics.recordDatabaseQueryFailure()
  metrics.recordCacheHit()
  metrics.recordCacheMiss()
  metrics.recordAuthenticationFailure()
  metrics.recordImageUploadFailure()
  currentTime = 3_000

  assert.deepEqual(metrics.snapshot(), {
    startedAt: '1970-01-01T00:00:01.000Z',
    uptimeSeconds: 2,
    requests: {
      total: 2,
      errors: 1,
      averageLatencyMs: 20,
      maximumLatencyMs: 30,
      statusClasses: { '2xx': 1, '5xx': 1 },
    },
    databaseQueryFailures: 1,
    cache: { hits: 1, misses: 1 },
    authenticationFailures: 1,
    imageUploadFailures: 1,
  })
})

test('sanitizes server errors and never logs diagnostic messages or secrets', () => {
  const logs = []
  const metrics = createOperationalMetrics()
  const middleware = createErrorMiddleware({
    log: { error: (event, fields) => logs.push({ event, fields }) },
    metrics,
  })
  const request = {
    id: 'request_123',
    method: 'GET',
    observabilityBase: '/api/v1/properties',
    path: '/',
    route: { path: '/' },
  }
  const response = createResponse()
  const error = new Error(
    'postgresql://user:password@host/database?token=secret',
  )

  middleware(error, request, response, () => {})

  assert.deepEqual(response.body, {
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
      requestId: 'request_123',
    },
  })
  assert.equal(response.statusCode, 500)
  assert.doesNotMatch(JSON.stringify(logs), /password|postgresql|secret|token/i)
  // The frames are kept for diagnosis; the message line that carried the
  // credentials above is not.
  assert.match(logs[0].fields.stack, /observability\.test\.js/)
})

test('maps body parser failures instead of calling them internal errors', () => {
  const middleware = createErrorMiddleware({
    log: { error: () => {} },
    metrics: createOperationalMetrics(),
  })
  const request = {
    id: 'request_123',
    method: 'POST',
    observabilityBase: '/api/v1/properties',
    path: '/',
    route: { path: '/' },
  }

  const malformed = Object.assign(
    new SyntaxError('Unexpected token } in JSON at position 12'),
    { status: 400, statusCode: 400, type: 'entity.parse.failed' },
  )
  const malformedResponse = createResponse()
  middleware(malformed, request, malformedResponse, () => {})

  assert.equal(malformedResponse.statusCode, 400)
  assert.deepEqual(malformedResponse.body, {
    error: {
      code: 'INVALID_REQUEST',
      message: 'The request body is not valid JSON.',
      requestId: 'request_123',
    },
  })

  const tooLarge = Object.assign(new Error('request entity too large'), {
    status: 413,
    statusCode: 413,
    type: 'entity.too.large',
  })
  const tooLargeResponse = createResponse()
  middleware(tooLarge, request, tooLargeResponse, () => {})

  assert.equal(tooLargeResponse.statusCode, 413)
  assert.deepEqual(tooLargeResponse.body, {
    error: {
      code: 'PAYLOAD_TOO_LARGE',
      message: 'The request body is too large.',
      requestId: 'request_123',
    },
  })
})

test('keeps liveness lightweight and readiness dependency-safe', async () => {
  const lifecycle = createApplicationLifecycle()
  const metrics = createOperationalMetrics()
  const readinessLogs = []
  const healthy = createHealthController({
    database: { $queryRaw: async () => [{ '?column?': 1 }] },
    lifecycle,
    log: { error: (event, fields) => readinessLogs.push({ event, fields }) },
    metrics,
  })
  const healthResponse = createResponse()
  healthy.getHealth(null, healthResponse)
  assert.deepEqual(healthResponse.body, { status: 'ok' })

  const readyResponse = createResponse()
  await healthy.getReadiness(null, readyResponse)
  assert.equal(readyResponse.statusCode, 200)
  assert.deepEqual(readyResponse.body, { status: 'ready' })

  const unavailable = createHealthController({
    database: {
      $queryRaw: async () => {
        throw new Error('database URL and secret must stay private')
      },
    },
    lifecycle,
    log: { error: (event, fields) => readinessLogs.push({ event, fields }) },
    metrics,
  })
  const unavailableResponse = createResponse()
  await unavailable.getReadiness(null, unavailableResponse)
  assert.equal(unavailableResponse.statusCode, 503)
  assert.deepEqual(unavailableResponse.body, { status: 'not_ready' })
  assert.equal(metrics.snapshot().databaseQueryFailures, 1)
  assert.deepEqual(readinessLogs, [
    {
      event: 'readiness_failed',
      fields: {
        category: 'database',
        component: 'readiness',
        requestId: undefined,
        status: 503,
      },
    },
  ])
  assert.doesNotMatch(JSON.stringify(readinessLogs), /secret|database URL/i)

  lifecycle.markShuttingDown()
  const drainingResponse = createResponse()
  await healthy.getReadiness(null, drainingResponse)
  assert.equal(drainingResponse.statusCode, 503)
})

test('graceful shutdown drains once, disconnects Prisma, and exits cleanly', async () => {
  const events = []
  const lifecycle = createApplicationLifecycle()
  let closeCallback
  let disconnected = false
  let exitCode
  let timerCleared = false
  let temporaryFilesRemoved = false
  const shutdown = createGracefulShutdown({
    cleanup: async () => {
      temporaryFilesRemoved = true
    },
    clearTimer: () => {
      timerCleared = true
    },
    database: {
      async $disconnect() {
        disconnected = true
      },
    },
    exit: (code) => {
      exitCode = code
    },
    httpServer: {
      close(callback) {
        closeCallback = callback
      },
    },
    lifecycle,
    log: {
      error: (event) => events.push(event),
      info: (event) => events.push(event),
    },
    setTimer: () => ({ unref() {} }),
  })

  assert.equal(shutdown('SIGTERM'), true)
  assert.equal(shutdown('SIGINT'), false)
  assert.equal(lifecycle.isShuttingDown(), true)
  closeCallback()
  await new Promise((resolve) => setImmediate(resolve))

  assert.equal(disconnected, true)
  assert.equal(temporaryFilesRemoved, true)
  assert.equal(timerCleared, true)
  assert.equal(exitCode, 0)
  assert.deepEqual(events, ['shutdown_started', 'shutdown_completed'])
})

test('a fatal shutdown drains normally but still exits non-zero', async () => {
  let exitCode
  const events = []
  const shutdown = createGracefulShutdown({
    cleanup: async () => {},
    clearTimer: () => {},
    database: { async $disconnect() {} },
    exit: (code) => {
      exitCode = code
    },
    httpServer: {
      close(callback) {
        callback()
      },
    },
    lifecycle: createApplicationLifecycle(),
    log: {
      error: (event) => events.push(event),
      info: (event) => events.push(event),
    },
    setTimer: () => ({ unref() {} }),
  })

  assert.equal(shutdown('uncaught_exception', { failed: true }), true)
  await new Promise((resolve) => setImmediate(resolve))

  assert.equal(exitCode, 1)
  assert.deepEqual(events, ['shutdown_started', 'shutdown_failed'])
})
