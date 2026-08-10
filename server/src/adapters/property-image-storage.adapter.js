import { createClient } from '@supabase/supabase-js'

import storageEnv from '../config/storage-env.js'

function configurationError() {
  const error = new Error('Image storage is not configured.')
  error.code = 'STORAGE_CONFIGURATION_ERROR'
  error.statusCode = 500
  return error
}

function operationError() {
  const error = new Error('The image storage operation failed.')
  error.code = 'STORAGE_OPERATION_FAILED'
  error.statusCode = 502
  return error
}

// A hung call would otherwise block its caller forever and, for a video, hold
// one of the two upload slots with it. Uploads get a generous budget because a
// multi-gigabyte file legitimately takes a long time; every other call is
// metadata-sized and has no reason to outlive half a minute.
const uploadTimeoutMs = 30 * 60 * 1_000
const shortTimeoutMs = 30_000

const retryDelaysMs = [250, 1_000]

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * storage-js exposes no per-call AbortSignal for `upload` or `remove`, so the
 * bound is applied one layer down, in the fetch the client is built with. The
 * HTTP method identifies the operation: only an upload carries a body.
 */
export function createTimeoutFetch(baseFetch = globalThis.fetch) {
  return function fetchWithTimeout(input, init = {}) {
    const method = String(init.method ?? 'GET').toUpperCase()
    const timeout = AbortSignal.timeout(
      method === 'POST' || method === 'PUT' ? uploadTimeoutMs : shortTimeoutMs,
    )
    const signal =
      init.signal && typeof AbortSignal.any === 'function'
        ? AbortSignal.any([init.signal, timeout])
        : timeout

    return baseFetch(input, { ...init, signal })
  }
}

export function isTimeoutStorageError(error) {
  const name = error?.originalError?.name ?? error?.name
  return name === 'TimeoutError' || name === 'AbortError'
}

/**
 * Transient means the same call could plausibly succeed if repeated: a 5xx
 * from the service, or a failure that never produced an HTTP status at all.
 * A 4xx is a decision about this particular request, so repeating it only
 * wastes time. An aborted call has already spent its entire time budget and
 * is never repeated either.
 */
export function isTransientStorageError(error) {
  if (!error || isTimeoutStorageError(error)) return false

  const status = Number(
    error.status ?? error.statusCode ?? error.originalError?.status,
  )
  if (Number.isFinite(status) && status > 0) return status >= 500
  return true
}

export async function withTransientRetry(
  operation,
  {
    attempts = retryDelaysMs.length + 1,
    delay = wait,
    retryable = isTransientStorageError,
  } = {},
) {
  let result
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    result = await operation()
    if (
      !result?.error ||
      attempt === attempts - 1 ||
      !retryable(result.error)
    ) {
      return result
    }
    await delay(retryDelaysMs[Math.min(attempt, retryDelaysMs.length - 1)])
  }
  return result
}

export function createPropertyImageStorageAdapter({
  client,
  bucket = storageEnv.supabaseStorageBucket,
} = {}) {
  if (!client || !bucket) throw configurationError()

  const storage = client.storage.from(bucket)

  return {
    async upload(
      storagePath,
      buffer,
      { contentType = 'image/webp', upsert = false } = {},
    ) {
      // A stream body can only be sent once, so a video upload is never
      // repeated: a second attempt would send an already-consumed stream and
      // store a truncated object. Buffers (images) are safe to resend.
      const replayable = Buffer.isBuffer(buffer) || typeof buffer === 'string'
      const { error } = await withTransientRetry(
        () =>
          storage.upload(storagePath, buffer, {
            cacheControl: '31536000',
            contentType,
            upsert,
          }),
        replayable ? {} : { attempts: 1 },
      )
      if (error) throw operationError()

      const { data } = storage.getPublicUrl(storagePath)
      if (!data?.publicUrl) throw operationError()
      return { url: data.publicUrl }
    },

    async download(storagePath) {
      const { data, error } = await storage.download(storagePath)
      if (error || !data) throw operationError()
      return Buffer.from(await data.arrayBuffer())
    },

    // Always retried: removal is idempotent, and it runs on the compensation
    // paths where giving up leaves an object nothing points at any more.
    async remove(storagePath) {
      const { error } = await withTransientRetry(() =>
        storage.remove([storagePath]),
      )
      if (error) throw operationError()
    },
  }
}

let defaultClient
let defaultAdapter
let videoAdapter

function getClient() {
  if (!defaultClient) {
    if (!storageEnv.supabaseUrl || !storageEnv.supabaseSecretKey) {
      throw configurationError()
    }
    defaultClient = createClient(
      storageEnv.supabaseUrl,
      storageEnv.supabaseSecretKey,
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
        global: { fetch: createTimeoutFetch() },
      },
    )
  }
  return defaultClient
}

export function getPropertyImageStorageAdapter() {
  if (!defaultAdapter) {
    if (!storageEnv.supabaseStorageBucket) throw configurationError()
    defaultAdapter = createPropertyImageStorageAdapter({
      client: getClient(),
    })
  }
  return defaultAdapter
}

// Same adapter shape, bound to the video bucket. Public URLs are built from
// the bucket it is bound to, so video URLs resolve against this bucket.
export function getPropertyVideoStorageAdapter() {
  if (!videoAdapter) {
    if (!storageEnv.supabaseVideoBucket) throw configurationError()
    videoAdapter = createPropertyImageStorageAdapter({
      bucket: storageEnv.supabaseVideoBucket,
      client: getClient(),
    })
  }
  return videoAdapter
}

export const propertyVideoStorage = {
  upload(...args) {
    return getPropertyVideoStorageAdapter().upload(...args)
  },
  download(...args) {
    return getPropertyVideoStorageAdapter().download(...args)
  },
  remove(...args) {
    return getPropertyVideoStorageAdapter().remove(...args)
  },
}

export default {
  upload(...args) {
    return getPropertyImageStorageAdapter().upload(...args)
  },
  download(...args) {
    return getPropertyImageStorageAdapter().download(...args)
  },
  remove(...args) {
    return getPropertyImageStorageAdapter().remove(...args)
  },
}
