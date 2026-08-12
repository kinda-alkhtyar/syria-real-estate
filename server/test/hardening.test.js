import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { test } from 'node:test'

process.env.CORS_ORIGINS = 'https://client.example'

const [
  { parseApplicationEnvironment, productionConfigurationWarnings },
  { createErrorMiddleware },
  { default: noStoreMiddleware },
  { default: notFoundMiddleware },
  { createOperationalMetrics },
  { createGracefulShutdown },
] = await Promise.all([
  import('../src/config/env.js'),
  import('../src/middleware/error.middleware.js'),
  import('../src/middleware/no-store.middleware.js'),
  import('../src/middleware/not-found.middleware.js'),
  import('../src/observability/metrics.js'),
  import('../src/utils/graceful-shutdown.js'),
])

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
  // Mirrors Express: appends rather than replaces, so an existing
  // `Vary: Origin` from CORS survives.
  response.vary = function vary(field) {
    const current = this.headers.Vary
    this.headers.Vary = current ? `${current}, ${field}` : field
    return this
  }
  return response
}

function createErrorRequest() {
  return {
    id: 'request_123',
    method: 'GET',
    observabilityBase: '/api/v1/properties',
    path: '/',
    route: { path: '/' },
  }
}

function silentErrorMiddleware() {
  return createErrorMiddleware({
    log: { error: () => {} },
    metrics: createOperationalMetrics(),
  })
}

test('never echoes an error code the API did not raise on purpose', () => {
  const middleware = silentErrorMiddleware()

  // Prisma's unique-constraint failure. Its code passes the shape check for a
  // public code, but naming it back would confirm which constraint was hit.
  const databaseFailure = Object.assign(new Error('Unique constraint failed'), {
    code: 'P2002',
    meta: { modelName: 'Property', target: ['slug'] },
  })
  const databaseResponse = createResponse()
  middleware(databaseFailure, createErrorRequest(), databaseResponse, () => {})

  assert.equal(databaseResponse.statusCode, 500)
  assert.deepEqual(databaseResponse.body, {
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
      requestId: 'request_123',
    },
  })

  // A socket failure from the driver reaches the handler the same way.
  const driverFailure = Object.assign(new Error('read ECONNRESET'), {
    code: 'ECONNRESET',
  })
  const driverResponse = createResponse()
  middleware(driverFailure, createErrorRequest(), driverResponse, () => {})

  assert.equal(driverResponse.body.error.code, 'INTERNAL_SERVER_ERROR')
})

test('keeps the code of a 5xx this API raised deliberately', () => {
  const middleware = silentErrorMiddleware()

  // Both are declared with their status, which is what marks them as ours.
  const busy = Object.assign(new Error('Too many video uploads.'), {
    code: 'UPLOAD_BUSY',
    statusCode: 503,
  })
  const busyResponse = createResponse()
  middleware(busy, createErrorRequest(), busyResponse, () => {})

  assert.equal(busyResponse.statusCode, 503)
  assert.equal(busyResponse.body.error.code, 'UPLOAD_BUSY')
  // The message is still withheld: only the code is a public contract.
  assert.equal(busyResponse.body.error.message, 'An unexpected error occurred.')

  const forbidden = Object.assign(new Error('The request origin is not allowed.'), {
    code: 'ORIGIN_DENIED',
    statusCode: 403,
  })
  const forbiddenResponse = createResponse()
  middleware(forbidden, createErrorRequest(), forbiddenResponse, () => {})

  assert.equal(forbiddenResponse.statusCode, 403)
  assert.deepEqual(forbiddenResponse.body, {
    error: {
      code: 'ORIGIN_DENIED',
      message: 'The request origin is not allowed.',
      requestId: 'request_123',
    },
  })
})

test('marks session-scoped responses as unstorable without dropping Vary', () => {
  const response = createResponse()
  // What the CORS layer has already written before this middleware runs.
  response.headers.Vary = 'Origin'

  let advanced = false
  noStoreMiddleware({}, response, () => {
    advanced = true
  })

  assert.equal(advanced, true)
  assert.equal(response.headers['Cache-Control'], 'no-store')
  assert.equal(response.headers.Vary, 'Origin, Cookie')
})

test('an unmatched route answers with the same envelope as every other error', () => {
  const response = createResponse()
  notFoundMiddleware({ id: 'request_123' }, response)

  assert.equal(response.statusCode, 404)
  assert.deepEqual(response.body, {
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'The requested resource was not found.',
      requestId: 'request_123',
    },
  })
})

test('reports production configuration that boots but should not stay', () => {
  const base = {
    CORS_ORIGINS: 'https://client.example',
    NODE_ENV: 'production',
    TRUST_PROXY: 'false',
  }

  // Directly exposed in production: every caller shares one rate-limit bucket.
  assert.deepEqual(
    productionConfigurationWarnings(parseApplicationEnvironment(base)),
    ['TRUST_PROXY_DISABLED'],
  )

  assert.deepEqual(
    productionConfigurationWarnings(
      parseApplicationEnvironment({
        ...base,
        CORS_ORIGINS: 'https://client.example,http://legacy.example',
        TRUST_PROXY: '1',
      }),
    ),
    ['INSECURE_CORS_ORIGIN'],
  )

  // A correct production deployment is silent.
  assert.deepEqual(
    productionConfigurationWarnings(
      parseApplicationEnvironment({ ...base, TRUST_PROXY: '1' }),
    ),
    [],
  )

  // Development runs on http and without a proxy by design.
  assert.deepEqual(
    productionConfigurationWarnings(
      parseApplicationEnvironment({
        CORS_ORIGINS: 'http://localhost:5173',
        NODE_ENV: 'development',
      }),
    ),
    [],
  )
})

test('drains idle keep-alive sockets instead of waiting out the timeout', () => {
  const calls = []
  const httpServer = {
    close(callback) {
      calls.push('close')
      // Deliberately never invoked: the assertion is about what happens while
      // the drain is still open.
      void callback
    },
    closeIdleConnections() {
      calls.push('closeIdleConnections')
    },
  }

  const shutdown = createGracefulShutdown({
    cleanup: async () => {},
    database: { $disconnect: async () => {} },
    exit: () => {},
    httpServer,
    lifecycle: { markShuttingDown() {}, isShuttingDown: () => true },
    log: { error: () => {}, info: () => {} },
    setTimer: () => ({ unref() {} }),
  })

  assert.equal(shutdown('SIGTERM'), true)
  assert.deepEqual(calls, ['close', 'closeIdleConnections'])
  // A second signal during the drain must not restart it.
  assert.equal(shutdown('SIGTERM'), false)
})
