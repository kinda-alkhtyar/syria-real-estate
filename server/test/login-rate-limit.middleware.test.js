import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createAccountLoginRateLimiter } from '../src/middleware/login-rate-limit.middleware.js'

function createResponse() {
  return {
    headers: {},
    set(name, value) {
      this.headers[name] = value
      return this
    },
  }
}

function attempt(limiter, email, response = createResponse()) {
  let captured
  limiter.middleware({ body: { email } }, response, (error) => {
    captured = error ?? null
  })
  return { error: captured, response }
}

test('lets an account through until its failed attempts reach the limit', () => {
  const limiter = createAccountLoginRateLimiter({ limit: 3 })
  const email = 'owner@example.invalid'

  for (let index = 0; index < 3; index += 1) {
    assert.equal(attempt(limiter, email).error, null)
    limiter.recordFailure(email)
  }

  const blocked = attempt(limiter, email)
  assert.equal(blocked.error.code, 'LOGIN_RATE_LIMITED')
  assert.equal(blocked.error.statusCode, 429)
  assert.equal(blocked.error.message, 'Too many login attempts. Try again later.')
  assert.ok(Number(blocked.response.headers['Retry-After']) > 0)
})

test('counts one account regardless of address casing and never another', () => {
  const limiter = createAccountLoginRateLimiter({ limit: 2 })

  limiter.recordFailure('  Owner@Example.invalid ')
  limiter.recordFailure('OWNER@EXAMPLE.INVALID')

  assert.equal(
    attempt(limiter, 'owner@example.invalid').error.code,
    'LOGIN_RATE_LIMITED',
  )
  assert.equal(attempt(limiter, 'other@example.invalid').error, null)
})

test('forgets failures once the window has passed', () => {
  let currentTime = 1_000
  const limiter = createAccountLoginRateLimiter({
    limit: 1,
    now: () => currentTime,
    windowMs: 60_000,
  })
  const email = 'owner@example.invalid'

  limiter.recordFailure(email)
  assert.equal(attempt(limiter, email).error.code, 'LOGIN_RATE_LIMITED')

  currentTime += 60_001
  assert.equal(attempt(limiter, email).error, null)
})

test('ignores a missing or unusable email so validation still answers', () => {
  const limiter = createAccountLoginRateLimiter({ limit: 1 })

  limiter.recordFailure(undefined)
  limiter.recordFailure('   ')

  assert.equal(attempt(limiter, undefined).error, null)
  assert.equal(attempt(limiter, 42).error, null)
})
