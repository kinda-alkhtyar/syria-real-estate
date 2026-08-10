import { createHash } from 'node:crypto'

import env from '../config/env.js'
import { normalizeEmail } from '../utils/email.js'

import { createRateLimiter } from './rate-limit.middleware.js'

export function createLoginRateLimiter({
  limit = env.authLoginRateLimit,
  windowMs = env.authLoginRateWindowMinutes * 60 * 1000,
  now = Date.now,
} = {}) {
  return createRateLimiter({
    code: 'LOGIN_RATE_LIMITED',
    limit,
    message: 'Too many login attempts. Try again later.',
    now,
    windowMs,
  })
}

export const loginRateLimiter = createLoginRateLimiter()

// A distributed attacker rotates client IPs, so the limiter above never sees
// enough attempts from one key to trigger. This second limiter counts failed
// attempts per account instead, which no amount of IP rotation can spread.
export const accountLoginRateLimit = 10
export const accountLoginRateWindowMinutes = 15

const defaultMaximumAccounts = 10_000

// Deliberately identical to the per-IP limiter's code and message: a caller
// able to tell the two apart would learn that a given account exists and is
// under attack. Both values must stay in step with `createLoginRateLimiter`.
const loginRateLimitCode = 'LOGIN_RATE_LIMITED'
const loginRateLimitMessage = 'Too many login attempts. Try again later.'

/**
 * Derives the counter key. Only the digest is ever held, so no address reaches
 * memory, a log line, or a metric label.
 */
function accountKey(email) {
  const normalized = normalizeEmail(email)
  if (!normalized) return null
  return createHash('sha256').update(normalized, 'utf8').digest('hex')
}

/**
 * Fixed-window limiter keyed by account, counting failed attempts only, so a
 * legitimate sign-in never consumes budget.
 *
 * Shares the memory bounds of the per-IP limiter: expired entries are swept
 * once per window, and the map is capped with least-recently-seen eviction.
 * Counters live in one process, so several instances multiply the effective
 * limit — the same shared-store caveat applies before scaling out.
 */
export function createAccountLoginRateLimiter({
  limit = accountLoginRateLimit,
  maximumAccounts = defaultMaximumAccounts,
  now = Date.now,
  windowMs = accountLoginRateWindowMinutes * 60 * 1_000,
} = {}) {
  const failures = new Map()
  let nextSweepAt = 0

  function sweepExpired(currentTime) {
    if (currentTime < nextSweepAt) return
    nextSweepAt = currentTime + windowMs
    for (const [key, entry] of failures) {
      if (entry.resetAt <= currentTime) failures.delete(key)
    }
  }

  return {
    // Runs before credential verification, so an account already over the
    // limit costs no password hash.
    middleware(request, response, next) {
      const currentTime = now()
      sweepExpired(currentTime)

      const key = accountKey(request.body?.email)
      const entry = key ? failures.get(key) : null
      if (!entry || entry.resetAt <= currentTime || entry.count < limit) {
        next()
        return
      }

      response.set(
        'Retry-After',
        String(Math.max(1, Math.ceil((entry.resetAt - currentTime) / 1_000))),
      )
      const error = new Error(loginRateLimitMessage)
      error.code = loginRateLimitCode
      error.statusCode = 429
      next(error)
    },

    recordFailure(email) {
      const key = accountKey(email)
      if (!key) return

      const currentTime = now()
      sweepExpired(currentTime)
      const current = failures.get(key)
      const entry =
        !current || current.resetAt <= currentTime
          ? { count: 0, resetAt: currentTime + windowMs }
          : current

      entry.count += 1
      // Re-inserting keeps insertion order aligned with recency so the
      // eviction below drops the least recently seen account first.
      failures.delete(key)
      failures.set(key, entry)
      while (failures.size > maximumAccounts) {
        failures.delete(failures.keys().next().value)
      }
    },
  }
}

export const accountLoginRateLimiter = createAccountLoginRateLimiter()

export function accountLoginRateLimitMiddleware(request, response, next) {
  accountLoginRateLimiter.middleware(request, response, next)
}

export function recordFailedLoginAttempt(email) {
  accountLoginRateLimiter.recordFailure(email)
}
