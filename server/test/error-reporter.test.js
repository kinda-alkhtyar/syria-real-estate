import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { test } from 'node:test'

import { createErrorMiddleware } from '../src/middleware/error.middleware.js'
import { createErrorReporter } from '../src/observability/error-reporter.js'
import { createOperationalMetrics } from '../src/observability/metrics.js'

function createResponse() {
  const response = new EventEmitter()
  response.body = null
  response.headersSent = false
  response.statusCode = 200
  response.json = function json(body) {
    this.body = body
    return this
  }
  response.status = function status(statusCode) {
    this.statusCode = statusCode
    return this
  }
  return response
}

/**
 * Stands in for @sentry/node. Records the init options and every captured
 * event so the tests can assert on what would have been sent.
 */
function createSentryDouble() {
  const scope = {
    tags: {},
    level: null,
    setTag(name, value) {
      this.tags[name] = value
    },
    setLevel(level) {
      this.level = level
    },
  }

  return {
    initOptions: null,
    captured: [],
    scope,
    init(options) {
      this.initOptions = options
    },
    withScope(callback) {
      callback(scope)
    },
    captureException(error) {
      this.captured.push({ error, tags: { ...scope.tags }, level: scope.level })
    },
  }
}

test('stays completely inert when no DSN is configured', async () => {
  let loaded = false
  const reporter = createErrorReporter({
    dsn: '',
    loadSdk: () => {
      loaded = true
      return createSentryDouble()
    },
    log: { error: () => {}, info: () => {} },
  })

  assert.equal(reporter.configured, false)
  assert.equal(await reporter.initialize(), false)
  assert.equal(reporter.captureException(new Error('boom')), false)
  // The point of the dynamic import: an unconfigured deployment never even
  // loads the SDK, so it cannot install handlers or hooks of its own.
  assert.equal(loaded, false)
  assert.equal(reporter.isInitialized(), false)
})

test('initializes once with the DSN and leaves the fatal handlers to server.js', async () => {
  const sentry = createSentryDouble()
  let loads = 0
  const reporter = createErrorReporter({
    dsn: 'https://public@example.ingest.sentry.io/1',
    environment: 'production',
    loadSdk: () => {
      loads += 1
      return sentry
    },
    log: { error: () => {}, info: () => {} },
  })

  assert.equal(await reporter.initialize(), true)
  assert.equal(await reporter.initialize(), false)
  assert.equal(loads, 1)
  assert.equal(sentry.initOptions.dsn, 'https://public@example.ingest.sentry.io/1')
  assert.equal(sentry.initOptions.environment, 'production')

  const kept = sentry.initOptions.integrations([
    { name: 'OnUncaughtException' },
    { name: 'OnUnhandledRejection' },
    { name: 'Http' },
  ])
  assert.deepEqual(
    kept.map((integration) => integration.name),
    ['Http'],
  )
})

test('tags captured events with the request id and never throws', async () => {
  const sentry = createSentryDouble()
  const reporter = createErrorReporter({
    dsn: 'https://public@example.ingest.sentry.io/1',
    loadSdk: () => sentry,
    log: { error: () => {}, info: () => {} },
  })
  await reporter.initialize()

  const error = new Error('boom')
  assert.equal(
    reporter.captureException(error, {
      requestId: 'request_123',
      level: 'fatal',
      category: 'internal',
      status: 500,
      ignored: { nested: true },
    }),
    true,
  )

  assert.equal(sentry.captured.length, 1)
  assert.equal(sentry.captured[0].error, error)
  assert.equal(sentry.captured[0].tags.request_id, 'request_123')
  assert.equal(sentry.captured[0].tags.category, 'internal')
  assert.equal(sentry.captured[0].tags.status, 500)
  assert.equal(sentry.captured[0].level, 'fatal')
  // Non-primitives are dropped rather than serialized: a nested value could
  // carry anything the request supplied.
  assert.equal('ignored' in sentry.captured[0].tags, false)

  sentry.withScope = () => {
    throw new Error('transport is down')
  }
  assert.equal(reporter.captureException(error), false)
})

test('swallows an SDK that fails to load and keeps reporting disabled', async () => {
  const logs = []
  const reporter = createErrorReporter({
    dsn: 'https://public@example.ingest.sentry.io/1',
    loadSdk: () => Promise.reject(new TypeError('module not found')),
    log: { error: (event, fields) => logs.push({ event, fields }), info: () => {} },
  })

  assert.equal(await reporter.initialize(), false)
  assert.equal(reporter.isInitialized(), false)
  assert.equal(reporter.captureException(new Error('boom')), false)
  assert.equal(logs[0].event, 'error_reporter_init_failed')
  // The DSN carries the ingest key, so it must never reach a log line.
  assert.doesNotMatch(JSON.stringify(logs), /sentry\.io|public@/)
})

test('reports server errors to monitoring but not deliberate 4xx answers', () => {
  const captured = []
  const middleware = createErrorMiddleware({
    log: { error: () => {} },
    metrics: createOperationalMetrics(),
    reporter: {
      captureException: (error, context) => captured.push({ error, context }),
    },
  })
  const request = {
    id: 'request_123',
    method: 'GET',
    observabilityBase: '/api/v1/properties',
    path: '/',
    route: { path: '/' },
  }

  const rejected = Object.assign(new Error('The listing was not found.'), {
    code: 'NOT_FOUND',
    statusCode: 404,
  })
  middleware(rejected, request, createResponse(), () => {})
  assert.equal(captured.length, 0)

  const failure = new Error('connection terminated unexpectedly')
  const response = createResponse()
  middleware(failure, request, response, () => {})

  assert.equal(response.statusCode, 500)
  assert.equal(captured.length, 1)
  assert.equal(captured[0].error, failure)
  assert.equal(captured[0].context.requestId, 'request_123')
  assert.equal(captured[0].context.status, 500)
  assert.equal(captured[0].context.route, '/api/v1/properties/')
})
