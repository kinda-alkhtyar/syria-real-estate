import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  canonicalCacheKey,
  createPublicReadCache,
} from '../src/middleware/public-read-cache.middleware.js'

function createResponse() {
  const listeners = new Map()
  return {
    body: null,
    headers: {},
    statusCode: 200,
    json(body) {
      this.body = body
      listeners.get('finish')?.()
      return this
    },
    once(event, listener) {
      listeners.set(event, listener)
    },
    set(name, value) {
      this.headers[name] = value
      return this
    },
    status(statusCode) {
      this.statusCode = statusCode
      return this
    },
  }
}

async function invoke(middleware, request, response, handler) {
  await middleware(request, response, () => handler(response))
}

test('caches successful GET responses for a bounded TTL', async () => {
  let currentTime = 1_000
  let calls = 0
  const middleware = createPublicReadCache({
    now: () => currentTime,
    ttlMs: 5_000,
  })
  const request = { method: 'GET', originalUrl: '/?page=1' }
  const handler = (response) => {
    calls += 1
    response.json({ calls })
  }

  const first = createResponse()
  await invoke(middleware, request, first, handler)
  const cached = createResponse()
  await invoke(middleware, request, cached, handler)

  assert.equal(calls, 1)
  assert.deepEqual(cached.body, { calls: 1 })
  assert.equal(cached.headers['Cache-Control'], 'public, max-age=5')

  currentTime += 5_001
  const expired = createResponse()
  await invoke(middleware, request, expired, handler)
  assert.equal(calls, 2)
  assert.deepEqual(expired.body, { calls: 2 })
})

test('treats equivalent query strings as one entry', () => {
  assert.equal(canonicalCacheKey('/'), '/')
  // Parameters carrying the schema default describe the same request as their
  // absence, in any order.
  assert.equal(canonicalCacheKey('/?page=1&pageSize=20&sort=newest'), '/')
  assert.equal(
    canonicalCacheKey('/?pageSize=20&governorate=damascus&page=1'),
    '/?governorate=damascus',
  )
  assert.equal(
    canonicalCacheKey('/?propertyType=villa&governorate=damascus'),
    canonicalCacheKey('/?governorate=damascus&propertyType=villa'),
  )
  // A value that differs from the default is never dropped.
  assert.equal(canonicalCacheKey('/?page=2'), '/?page=2')
  assert.equal(canonicalCacheKey('/damascus-courtyard'), '/damascus-courtyard')
})

test('evicts the least recently used entry once the cap is reached', async () => {
  let calls = 0
  const middleware = createPublicReadCache({ maximumEntries: 2 })
  const handler = (response) => {
    calls += 1
    response.json({ calls })
  }
  const read = (originalUrl) =>
    invoke(middleware, { method: 'GET', originalUrl }, createResponse(), handler)

  await read('/?governorate=damascus')
  await read('/?governorate=aleppo')
  // Re-reading the older key makes it the most recent, so the next insert
  // evicts the other one instead.
  await read('/?governorate=damascus')
  assert.equal(calls, 2)

  await read('/?governorate=homs')
  await read('/?governorate=damascus')
  assert.equal(calls, 3)

  await read('/?governorate=aleppo')
  assert.equal(calls, 4)
})

test('coalesces concurrent misses for the same public URL', async () => {
  const middleware = createPublicReadCache()
  const request = { method: 'GET', originalUrl: '/damascus-courtyard' }
  let release
  const firstResponse = createResponse()
  const first = invoke(middleware, request, firstResponse, async (response) => {
    await new Promise((resolve) => {
      release = resolve
    })
    response.json({ slug: 'damascus-courtyard' })
  })
  while (!release) await new Promise((resolve) => setImmediate(resolve))

  const secondResponse = createResponse()
  const second = invoke(middleware, request, secondResponse, () => {
    throw new Error('A coalesced request must not reach the handler.')
  })
  release()
  await Promise.all([first, second])

  assert.deepEqual(secondResponse.body, {
    slug: 'damascus-courtyard',
  })
})

test('does not cache errors and invalidates reads after successful writes', async () => {
  const middleware = createPublicReadCache()
  let calls = 0
  const getRequest = { method: 'GET', originalUrl: '/' }
  const successfulHandler = (response) => {
    calls += 1
    response.json({ calls })
  }

  const errorResponse = createResponse()
  errorResponse.statusCode = 500
  await invoke(middleware, getRequest, errorResponse, (response) => {
    response.json({ error: true })
  })
  await invoke(middleware, getRequest, createResponse(), successfulHandler)
  assert.equal(calls, 1)

  const writeResponse = createResponse()
  await invoke(
    middleware,
    { method: 'PATCH', originalUrl: '/property-id' },
    writeResponse,
    (response) => response.json({ updated: true }),
  )
  await invoke(middleware, getRequest, createResponse(), successfulHandler)
  assert.equal(calls, 2)
})
