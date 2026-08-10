import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createPropertyVideoUploadMiddleware } from '../src/middleware/property-video-upload.middleware.js'
import { maximumVideoBytes } from '../src/utils/property-video.js'

function createResponse() {
  const listeners = new Map()
  return {
    once(event, listener) {
      listeners.set(event, listener)
      return this
    },
    close() {
      listeners.get('close')?.()
    },
  }
}

function createRequest(contentLength) {
  return { headers: { 'content-length': String(contentLength) } }
}

function captureNext() {
  const errors = []
  return {
    errors,
    next(error) {
      errors.push(error ?? null)
    },
  }
}

test('rejects a declared oversize body before the parser runs', () => {
  let parserCalls = 0
  const middleware = createPropertyVideoUploadMiddleware({
    parser: () => {
      parserCalls += 1
    },
  })
  const { errors, next } = captureNext()

  middleware(createRequest(maximumVideoBytes + 1), createResponse(), next)

  assert.equal(parserCalls, 0)
  assert.equal(errors.length, 1)
  assert.equal(errors[0].code, 'VIDEO_TOO_LARGE')
  assert.equal(errors[0].statusCode, 413)
})

test('rejects uploads beyond the concurrency cap without queueing', () => {
  // A parser that never settles keeps each accepted request in flight.
  const middleware = createPropertyVideoUploadMiddleware({
    maximumConcurrentUploads: 2,
    parser: () => {},
  })
  const { errors, next } = captureNext()

  middleware(createRequest(1_000), createResponse(), next)
  middleware(createRequest(1_000), createResponse(), next)
  assert.equal(errors.length, 0)

  middleware(createRequest(1_000), createResponse(), next)
  assert.equal(errors.length, 1)
  assert.equal(errors[0].code, 'UPLOAD_BUSY')
  assert.equal(errors[0].statusCode, 503)
})

test('releases the concurrency slot when the response closes', () => {
  const middleware = createPropertyVideoUploadMiddleware({
    maximumConcurrentUploads: 1,
    parser: () => {},
  })
  const { errors, next } = captureNext()
  const inFlight = createResponse()

  middleware(createRequest(1_000), inFlight, next)
  middleware(createRequest(1_000), createResponse(), next)
  assert.equal(errors.length, 1)
  assert.equal(errors[0].code, 'UPLOAD_BUSY')

  // A client abort emits `close` just as a completed response does; a second
  // emit must not free the slot twice.
  inFlight.close()
  inFlight.close()

  middleware(createRequest(1_000), createResponse(), next)
  assert.equal(errors.length, 1)

  middleware(createRequest(1_000), createResponse(), next)
  assert.equal(errors.length, 2)
  assert.equal(errors[1].code, 'UPLOAD_BUSY')
})
