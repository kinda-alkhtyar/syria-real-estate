import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createHealthController } from '../src/controllers/health.controller.js'

function createResponse() {
  return {
    body: null,
    statusCode: 200,
    json(body) {
      this.body = body
      return this
    },
    status(statusCode) {
      this.statusCode = statusCode
      return this
    },
  }
}

function createLifecycle() {
  return { isShuttingDown: () => false }
}

test('runs at most one readiness query per cache window', async () => {
  let currentTime = 1_000
  let queries = 0
  const controller = createHealthController({
    cacheTtlMs: 1_000,
    database: {
      $queryRaw: async () => {
        queries += 1
        return [{ '?column?': 1 }]
      },
    },
    lifecycle: createLifecycle(),
    now: () => currentTime,
  })

  const responses = [createResponse(), createResponse(), createResponse()]
  await Promise.all(responses.map((response) => controller.getReadiness(null, response)))
  await controller.getReadiness(null, createResponse())

  assert.equal(queries, 1)
  for (const response of responses) {
    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.body, { status: 'ready' })
  }

  currentTime += 1_001
  await controller.getReadiness(null, createResponse())
  assert.equal(queries, 2)
})

test('keeps reporting failure while the cached probe is still fresh', async () => {
  let currentTime = 1_000
  let queries = 0
  let failures = 0
  const controller = createHealthController({
    cacheTtlMs: 1_000,
    database: {
      $queryRaw: async () => {
        queries += 1
        throw new Error('database URL and secret must stay private')
      },
    },
    lifecycle: createLifecycle(),
    log: { error: () => {} },
    metrics: {
      recordDatabaseQueryFailure: () => {
        failures += 1
      },
    },
    now: () => currentTime,
  })

  const first = createResponse()
  await controller.getReadiness(null, first)
  const cached = createResponse()
  await controller.getReadiness(null, cached)

  assert.equal(queries, 1)
  assert.equal(failures, 1)
  assert.equal(first.statusCode, 503)
  assert.deepEqual(first.body, { status: 'not_ready' })
  assert.equal(cached.statusCode, 503)
  assert.deepEqual(cached.body, { status: 'not_ready' })
})
