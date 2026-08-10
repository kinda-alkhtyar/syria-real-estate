import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'

import express from 'express'

process.env.CORS_ORIGINS = 'https://client.example'

const [
  {
    createAuthRouter,
    createLoginRateLimiter,
    createRequireAllowedOrigin,
  },
  { createAuthCookieManager },
  { createRequireAuthentication, requireRole },
  { default: errorMiddleware },
] = await Promise.all([
  import('../src/routes/auth.routes.js'),
  import('../src/utils/auth-cookie.js'),
  import('../src/middleware/authentication.middleware.js'),
  import('../src/middleware/error.middleware.js'),
])

const allowedOrigin = 'https://client.example'
const now = new Date('2026-07-25T12:00:00.000Z')
const expiresAt = new Date('2026-07-26T00:00:00.000Z')
const sessions = new Map()
const safeOwner = {
  id: 'owner-id',
  email: 'owner@example.invalid',
  name: 'Development owner',
  role: 'OWNER',
}

function invalidCredentials() {
  const error = new Error('Invalid email or password.')
  error.code = 'INVALID_CREDENTIALS'
  error.statusCode = 401
  return error
}

function createMockService() {
  return {
    async verifyCredentials(email, password) {
      if (
        email !== safeOwner.email ||
        password !== 'valid-password'
      ) {
        throw invalidCredentials()
      }
      return safeOwner
    },

    async createSession(userId) {
      const rawToken = `token-for-${userId}`
      sessions.set(rawToken, {
        id: 'session-id',
        expiresAt,
        user: {
          id: userId,
          name: safeOwner.name,
          role: safeOwner.role,
        },
      })
      return { id: 'session-id', rawToken, expiresAt }
    },

    async authenticateSession(rawToken) {
      return sessions.get(rawToken) ?? null
    },

    async revokeSession(rawToken) {
      return sessions.delete(rawToken) ? 1 : 0
    },
  }
}

function createTestApp({
  service = createMockService(),
  rateLimitMiddleware = createLoginRateLimiter({ limit: 100 }),
} = {}) {
  const cookieManager = createAuthCookieManager({
    name: 'test_session',
    secure: true,
    now: () => now,
  })
  const app = express()
  app.use(express.json())
  app.use(
    '/api/v1/auth',
    createAuthRouter({
      service,
      cookieManager,
      originMiddleware: createRequireAllowedOrigin([allowedOrigin]),
      rateLimitMiddleware,
    }),
  )
  const authenticate = createRequireAuthentication({
    service,
    cookieManager,
  })
  app.get(
    '/test/owner',
    authenticate,
    requireRole('OWNER'),
    (_request, response) => response.status(204).end(),
  )
  app.get(
    '/test/admin',
    authenticate,
    requireRole('ADMIN'),
    (_request, response) => response.status(204).end(),
  )
  app.use(errorMiddleware)
  return app
}

async function listen(app) {
  const server = app.listen(0)
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
      }),
  }
}

let baseUrl
let closeServer

before(async () => {
  sessions.clear()
  const running = await listen(createTestApp())
  baseUrl = running.baseUrl
  closeServer = running.close
})

after(async () => {
  await closeServer()
})

async function request(
  path,
  { method = 'GET', body, cookie, origin = allowedOrigin } = {},
) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (cookie) headers.Cookie = cookie
  if (origin !== null) headers.Origin = origin
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  return {
    body: text ? JSON.parse(text) : null,
    headers: response.headers,
    status: response.status,
  }
}

function cookiePair(response) {
  return response.headers.get('set-cookie').split(';', 1)[0]
}

test('login sets a secure opaque cookie and returns only safe user data', async () => {
  const response = await request('/api/v1/auth/login', {
    method: 'POST',
    body: {
      email: safeOwner.email,
      password: 'valid-password',
    },
  })
  const setCookie = response.headers.get('set-cookie')

  assert.equal(response.status, 200)
  assert.deepEqual(response.body, { data: { user: safeOwner } })
  assert.match(setCookie, /^test_session=/)
  assert.match(setCookie, /HttpOnly/i)
  assert.match(setCookie, /Secure/i)
  assert.match(setCookie, /SameSite=Lax/i)
  assert.match(setCookie, /Path=\//i)
  assert.match(setCookie, /Max-Age=43200/i)
  assert.ok(!JSON.stringify(response.body).includes('token-for-owner-id'))
  assert.ok(!JSON.stringify(response.body).includes('password'))
})

test('invalid, passwordless, and inactive account simulations share one response', async () => {
  for (const email of [
    'unknown@example.invalid',
    'passwordless@example.invalid',
    'inactive@example.invalid',
  ]) {
    const response = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password: 'wrong-password' },
    })
    assert.equal(response.status, 401)
    assert.equal(response.body.error.code, 'INVALID_CREDENTIALS')
    assert.equal(response.body.error.message, 'Invalid email or password.')
  }
})

test('authenticated me returns safe identity and unauthenticated me returns 401', async () => {
  const login = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: safeOwner.email, password: 'valid-password' },
  })
  const authenticated = await request('/api/v1/auth/me', {
    cookie: cookiePair(login),
  })
  const unauthenticated = await request('/api/v1/auth/me')

  assert.equal(authenticated.status, 200)
  assert.deepEqual(authenticated.body, {
    data: {
      user: {
        id: safeOwner.id,
        name: safeOwner.name,
        role: safeOwner.role,
      },
    },
  })
  assert.equal(unauthenticated.status, 401)
  assert.equal(
    unauthenticated.body.error.code,
    'AUTHENTICATION_REQUIRED',
  )
})

test('logout revokes the current session, clears the cookie, and is idempotent', async () => {
  const login = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: safeOwner.email, password: 'valid-password' },
  })
  const cookie = cookiePair(login)
  const logout = await request('/api/v1/auth/logout', {
    method: 'POST',
    cookie,
  })
  const repeatedLogout = await request('/api/v1/auth/logout', {
    method: 'POST',
  })
  const afterLogout = await request('/api/v1/auth/me', { cookie })

  assert.equal(logout.status, 204)
  assert.match(logout.headers.get('set-cookie'), /test_session=;/)
  assert.match(
    logout.headers.get('set-cookie'),
    /Expires=Thu, 01 Jan 1970 00:00:00 GMT/i,
  )
  assert.equal(repeatedLogout.status, 204)
  assert.equal(afterLogout.status, 401)
})

test('expired or revoked session tokens are rejected', async () => {
  const expired = await request('/api/v1/auth/me', {
    cookie: 'test_session=expired-token',
  })
  const revoked = await request('/api/v1/auth/me', {
    cookie: 'test_session=revoked-token',
  })

  assert.equal(expired.status, 401)
  assert.equal(revoked.status, 401)
})

test('role middleware allows owners and denies admin-only access', async () => {
  const login = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: safeOwner.email, password: 'valid-password' },
  })
  const cookie = cookiePair(login)
  const owner = await request('/test/owner', { cookie })
  const admin = await request('/test/admin', { cookie })

  assert.equal(owner.status, 204)
  assert.equal(admin.status, 403)
  assert.equal(admin.body.error.code, 'FORBIDDEN')
})

test('invalid login body uses the structured validation response', async () => {
  const response = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'not-an-email', password: '' },
  })

  assert.equal(response.status, 400)
  assert.equal(response.body.error.code, 'INVALID_REQUEST')
})

test('state-changing auth requests reject missing or untrusted origins', async () => {
  const missing = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: safeOwner.email, password: 'valid-password' },
    origin: null,
  })
  const untrusted = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: safeOwner.email, password: 'valid-password' },
    origin: 'https://attacker.example',
  })

  assert.equal(missing.status, 403)
  assert.equal(untrusted.status, 403)
  assert.equal(missing.body.error.code, 'ORIGIN_REQUIRED')
  assert.equal(untrusted.body.error.code, 'ORIGIN_DENIED')
})

test('login rate limiter returns 429 after the configured attempt limit', async () => {
  const running = await listen(
    createTestApp({
      rateLimitMiddleware: createLoginRateLimiter({
        limit: 2,
        windowMs: 60_000,
        now: () => 1_000,
      }),
    }),
  )

  try {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: allowedOrigin,
      },
      body: JSON.stringify({
        email: 'unknown@example.invalid',
        password: 'wrong',
      }),
    }
    const first = await fetch(`${running.baseUrl}/api/v1/auth/login`, options)
    const second = await fetch(`${running.baseUrl}/api/v1/auth/login`, options)
    const third = await fetch(`${running.baseUrl}/api/v1/auth/login`, options)
    const thirdBody = await third.json()

    assert.equal(first.status, 401)
    assert.equal(second.status, 401)
    assert.equal(third.status, 429)
    assert.equal(thirdBody.error.code, 'LOGIN_RATE_LIMITED')
    assert.equal(third.headers.get('retry-after'), '60')
  } finally {
    await running.close()
  }
})
