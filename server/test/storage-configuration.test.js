import assert from 'node:assert/strict'
import { test } from 'node:test'

const [
  { parseStorageEnvironment },
  { createPropertyImageStorageAdapter },
] = await Promise.all([
  import('../src/config/storage-env.js'),
  import('../src/adapters/property-image-storage.adapter.js'),
])

process.env.CORS_ORIGINS = 'https://client.example'
const { parseApplicationEnvironment } = await import('../src/config/env.js')

const storageOnlyEnvironment = {
  SUPABASE_URL: 'https://project-ref.supabase.co',
  SUPABASE_SECRET_KEY: 'sb_secret_test-only-placeholder',
  SUPABASE_STORAGE_BUCKET: 'property-images',
}

test('Storage configuration and adapter initialize without HTTP settings', () => {
  const storageEnv = parseStorageEnvironment(storageOnlyEnvironment)
  let selectedBucket
  const client = {
    storage: {
      from(bucket) {
        selectedBucket = bucket
        return {
          upload() {},
          download() {},
          remove() {},
          getPublicUrl() {},
        }
      },
    },
  }

  const adapter = createPropertyImageStorageAdapter({
    client,
    bucket: storageEnv.supabaseStorageBucket,
  })

  assert.equal(selectedBucket, 'property-images')
  assert.equal(typeof adapter.upload, 'function')
  assert.equal(typeof adapter.download, 'function')
  assert.equal(typeof adapter.remove, 'function')
})

test('missing and malformed Storage settings fail safely', () => {
  assert.throws(
    () => parseStorageEnvironment({}),
    /Invalid Storage environment configuration/,
  )
  assert.throws(
    () =>
      parseStorageEnvironment({
        ...storageOnlyEnvironment,
        SUPABASE_URL: 'http://not-secure.invalid',
      }),
    /Invalid Storage environment configuration/,
  )
  assert.throws(
    () =>
      parseStorageEnvironment({
        ...storageOnlyEnvironment,
        SUPABASE_SECRET_KEY: 'malformed',
      }),
    /Invalid Storage environment configuration/,
  )
  assert.throws(
    () =>
      parseStorageEnvironment({
        ...storageOnlyEnvironment,
        SUPABASE_STORAGE_BUCKET: '../unsafe',
      }),
    /Invalid Storage environment configuration/,
  )
})

test('full application configuration still strictly validates HTTP settings', () => {
  const applicationEnv = parseApplicationEnvironment({
    NODE_ENV: 'test',
    PORT: '3001',
    CORS_ORIGINS: 'https://client.example',
    AUTH_SESSION_TTL_HOURS: '12',
    AUTH_COOKIE_NAME: 'test_session',
    AUTH_LOGIN_RATE_LIMIT: '5',
    AUTH_LOGIN_RATE_WINDOW_MINUTES: '15',
  })

  assert.deepEqual(applicationEnv.corsOrigins, ['https://client.example'])
  assert.equal(applicationEnv.port, 3001)
  assert.throws(
    () => parseApplicationEnvironment({}),
    /Invalid environment configuration/,
  )
  assert.throws(
    () =>
      parseApplicationEnvironment({
        CORS_ORIGINS: 'not-a-valid-origin',
      }),
    /Invalid CORS origin URL/,
  )
})
