const defaultWindowMs = 60_000
const defaultMaximumKeys = 10_000

function rateLimitError(code, message) {
  const error = new Error(message)
  error.code = code
  error.statusCode = 429
  return error
}

/**
 * Fixed-window rate limiter keyed by client IP.
 *
 * Horizontal-scaling limitation: the counters live in the memory of a single
 * process. Running N instances multiplies the effective limit by N, and a
 * restart clears every counter. Move this state to a shared store (Redis)
 * before scaling beyond one instance.
 *
 * Memory is bounded two ways: expired entries are swept once per window, and
 * the map is capped at `maximumKeys` with least-recently-seen eviction.
 */
export function createRateLimiter({
  code = 'RATE_LIMITED',
  limit,
  maximumKeys = defaultMaximumKeys,
  message = 'Too many requests. Try again later.',
  now = Date.now,
  windowMs = defaultWindowMs,
} = {}) {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new TypeError('createRateLimiter requires a positive integer limit.')
  }

  const attempts = new Map()
  let nextSweepAt = 0

  function sweepExpired(currentTime) {
    if (currentTime < nextSweepAt) return
    nextSweepAt = currentTime + windowMs
    for (const [key, entry] of attempts) {
      if (entry.resetAt <= currentTime) attempts.delete(key)
    }
  }

  return function rateLimit(request, response, next) {
    const currentTime = now()
    sweepExpired(currentTime)

    const key = request.ip ?? 'unknown'
    const current = attempts.get(key)
    const entry =
      !current || current.resetAt <= currentTime
        ? { count: 0, resetAt: currentTime + windowMs }
        : current

    entry.count += 1
    // Re-inserting keeps insertion order aligned with recency so the eviction
    // below drops the least recently seen client first.
    attempts.delete(key)
    attempts.set(key, entry)
    while (attempts.size > maximumKeys) {
      attempts.delete(attempts.keys().next().value)
    }

    if (entry.count > limit) {
      response.set(
        'Retry-After',
        String(Math.max(1, Math.ceil((entry.resetAt - currentTime) / 1_000))),
      )
      next(rateLimitError(code, message))
      return
    }

    next()
  }
}

export function createGeneralApiRateLimiter(options = {}) {
  return createRateLimiter({
    code: 'RATE_LIMITED',
    limit: 300,
    message: 'Too many requests. Try again later.',
    windowMs: defaultWindowMs,
    ...options,
  })
}

export function createPropertyWriteRateLimiter(options = {}) {
  return createRateLimiter({
    code: 'WRITE_RATE_LIMITED',
    limit: 60,
    message: 'Too many write requests. Try again later.',
    windowMs: defaultWindowMs,
    ...options,
  })
}

// The management listing is the heaviest read in the API — a filtered
// `findMany` plus a `COUNT(*)`, with no read cache in front of it — so it gets
// the same allowance as a write rather than the general read allowance.
export function createManagementReadRateLimiter(options = {}) {
  return createRateLimiter({
    code: 'MANAGEMENT_RATE_LIMITED',
    limit: 60,
    message: 'Too many management requests. Try again later.',
    windowMs: defaultWindowMs,
    ...options,
  })
}

// A password change costs one argon2 verification plus one hash, and no
// legitimate account needs more than a handful an hour, so this is the
// tightest allowance on the API.
export function createPasswordChangeRateLimiter(options = {}) {
  return createRateLimiter({
    code: 'PASSWORD_CHANGE_RATE_LIMITED',
    limit: 5,
    message: 'Too many password change attempts. Try again later.',
    windowMs: 15 * 60_000,
    ...options,
  })
}

export function createImageUploadRateLimiter(options = {}) {
  return createRateLimiter({
    code: 'IMAGE_UPLOAD_RATE_LIMITED',
    limit: 20,
    message: 'Too many image uploads. Try again later.',
    windowMs: defaultWindowMs,
    ...options,
  })
}
