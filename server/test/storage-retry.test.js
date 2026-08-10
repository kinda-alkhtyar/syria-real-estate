import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  createPropertyImageStorageAdapter,
  isTransientStorageError,
  withTransientRetry,
} from '../src/adapters/property-image-storage.adapter.js'

const noDelay = async () => {}

function createStorageClient(responses) {
  const calls = { upload: 0, remove: 0 }
  const client = {
    storage: {
      from() {
        return {
          upload() {
            calls.upload += 1
            return responses.upload?.[calls.upload - 1] ?? { error: null }
          },
          remove() {
            calls.remove += 1
            return responses.remove?.[calls.remove - 1] ?? { error: null }
          },
          download() {
            return { data: null, error: null }
          },
          getPublicUrl() {
            return { data: { publicUrl: 'https://cdn.example/object' } }
          },
        }
      },
    },
  }
  return { calls, client }
}

test('classifies only repeatable storage failures as transient', () => {
  assert.equal(isTransientStorageError({ status: 503 }), true)
  assert.equal(isTransientStorageError({ status: 500 }), true)
  // No HTTP status at all: the request never reached the service.
  assert.equal(isTransientStorageError({ message: 'fetch failed' }), true)

  assert.equal(isTransientStorageError({ status: 400 }), false)
  assert.equal(isTransientStorageError({ status: 404 }), false)
  assert.equal(isTransientStorageError({ status: 409 }), false)
  assert.equal(isTransientStorageError(null), false)
  assert.equal(
    isTransientStorageError({ originalError: { name: 'TimeoutError' } }),
    false,
  )
  assert.equal(isTransientStorageError({ name: 'AbortError' }), false)
})

test('retries a transient failure three times at most, then reports it', async () => {
  const delays = []
  let attempts = 0
  const exhausted = await withTransientRetry(
    async () => {
      attempts += 1
      return { error: { status: 503 } }
    },
    { delay: (ms) => delays.push(ms) },
  )

  assert.equal(attempts, 3)
  assert.deepEqual(delays, [250, 1_000])
  assert.deepEqual(exhausted.error, { status: 503 })

  let recovered = 0
  const succeeded = await withTransientRetry(
    async () => {
      recovered += 1
      return recovered < 3 ? { error: { status: 502 } } : { error: null }
    },
    { delay: noDelay },
  )

  assert.equal(recovered, 3)
  assert.equal(succeeded.error, null)
})

test('never repeats a decision the service already made', async () => {
  let attempts = 0
  const rejected = await withTransientRetry(
    async () => {
      attempts += 1
      return { error: { status: 404 } }
    },
    { delay: noDelay },
  )

  assert.equal(attempts, 1)
  assert.deepEqual(rejected.error, { status: 404 })

  let timedOut = 0
  await withTransientRetry(
    async () => {
      timedOut += 1
      return { error: { originalError: { name: 'TimeoutError' } } }
    },
    { delay: noDelay },
  )
  assert.equal(timedOut, 1)
})

test('retries a buffer upload but never a stream upload', async () => {
  const buffered = createStorageClient({
    upload: [{ error: { status: 503 } }, { error: null }],
  })
  const bufferedAdapter = createPropertyImageStorageAdapter({
    bucket: 'property-images',
    client: buffered.client,
  })
  const uploaded = await bufferedAdapter.upload(
    'properties/a/one.webp',
    Buffer.from('image'),
  )

  assert.equal(buffered.calls.upload, 2)
  assert.equal(uploaded.url, 'https://cdn.example/object')

  const streamed = createStorageClient({
    upload: [{ error: { status: 503 } }, { error: null }],
  })
  const streamedAdapter = createPropertyImageStorageAdapter({
    bucket: 'property-videos',
    client: streamed.client,
  })
  await assert.rejects(
    streamedAdapter.upload('properties/a/one.mp4', { pipe() {} }),
    (error) => error.code === 'STORAGE_OPERATION_FAILED',
  )
  assert.equal(streamed.calls.upload, 1)
})

test('always retries a transient removal failure', async () => {
  const { calls, client } = createStorageClient({
    remove: [{ error: { status: 500 } }, { error: null }],
  })
  const adapter = createPropertyImageStorageAdapter({
    bucket: 'property-images',
    client,
  })

  await adapter.remove('properties/a/one.webp')
  assert.equal(calls.remove, 2)
})
