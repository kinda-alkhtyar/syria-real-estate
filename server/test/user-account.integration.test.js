import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'

import express from 'express'

process.env.CORS_ORIGINS = 'https://client.example'

const [
  { createUserRouter },
  { createUserService },
  { createRequireAuthentication },
  { createRequireAllowedOrigin },
  { createPasswordChangeRateLimiter, createPropertyWriteRateLimiter },
  { createAuthCookieManager },
  { hashPassword, verifyPassword },
  { default: errorMiddleware },
] = await Promise.all([
  import('../src/routes/user.routes.js'),
  import('../src/services/user.service.js'),
  import('../src/middleware/authentication.middleware.js'),
  import('../src/middleware/origin.middleware.js'),
  import('../src/middleware/rate-limit.middleware.js'),
  import('../src/utils/auth-cookie.js'),
  import('../src/utils/password.js'),
  import('../src/middleware/error.middleware.js'),
])

const allowedOrigin = 'https://client.example'
const cookieName = 'test_session'
const expiresAt = new Date('2026-12-31T00:00:00.000Z')

const ownerId = '11111111-1111-4111-8111-111111111111'
const googleUserId = '22222222-2222-4222-8222-222222222222'
const currentPassword = 'current-password-1'
const newPassword = 'a-much-better-password-2'

// Hashed once for the whole suite: argon2 is deliberately expensive, and every
// test starts from the same credential.
let currentPasswordHash

let users

function ownerRecord() {
  return {
    id: ownerId,
    email: 'owner@example.invalid',
    name: 'Owner account',
    phone: null,
    whatsapp: null,
    role: 'OWNER',
    passwordHash: currentPasswordHash,
  }
}

function googleRecord() {
  return {
    id: googleUserId,
    email: 'google@example.invalid',
    name: 'Google account',
    phone: null,
    whatsapp: null,
    role: 'USER',
    // A Google-only account: nothing to verify a current password against.
    passwordHash: null,
  }
}

// Reproduces the repository's `select`: the profile paths never see the hash.
function asProfileRow(record) {
  return {
    id: record.id,
    email: record.email,
    name: record.name,
    phone: record.phone,
    whatsapp: record.whatsapp,
    role: record.role,
  }
}

const mockUserRepository = {
  async findUserProfileById(id) {
    const record = users.get(id)
    return record ? asProfileRow(record) : null
  },

  async updateUserProfile(id, data) {
    const record = users.get(id)
    if (!record) {
      const error = new Error('Record to update not found.')
      error.code = 'P2025'
      throw error
    }
    const updated = { ...record, ...data }
    users.set(id, updated)
    return asProfileRow(updated)
  },

  async findUserPasswordCredential(id) {
    const record = users.get(id)
    return record ? { id: record.id, passwordHash: record.passwordHash } : null
  },

  async updateUserCredential(id, data) {
    const record = users.get(id)
    users.set(id, { ...record, ...data })
    return { id }
  },
}

// Sessions are keyed by the raw cookie value, exactly as the real service
// resolves them, so a password change that left them alone keeps working.
const sessions = new Map([
  [`session-${ownerId}`, ownerId],
  [`session-${googleUserId}`, googleUserId],
])

const mockAuthenticationService = {
  async authenticateSession(rawToken) {
    const userId = sessions.get(rawToken)
    const record = userId ? users.get(userId) : null
    if (!record) return null

    return {
      id: `id-${rawToken}`,
      expiresAt,
      user: { id: record.id, name: record.name, role: record.role },
    }
  },
}

let baseUrl
let closeServer

before(async () => {
  currentPasswordHash = await hashPassword(currentPassword)

  const cookieManager = createAuthCookieManager({
    name: cookieName,
    secure: true,
  })
  const authenticationMiddleware = createRequireAuthentication({
    service: mockAuthenticationService,
    cookieManager,
  })
  const service = createUserService({ repository: mockUserRepository })
  const originMiddleware = createRequireAllowedOrigin([allowedOrigin])

  const app = express()
  app.use(express.json())
  app.use(
    '/api/v1/users',
    createUserRouter({
      service,
      authenticationMiddleware,
      originMiddleware,
      // The shared limiters are exercised by their own suite; here they would
      // leak one test's counter into the next.
      writeRateLimitMiddleware: createPropertyWriteRateLimiter({ limit: 1_000 }),
      passwordRateLimitMiddleware: createPasswordChangeRateLimiter({
        limit: 1_000,
      }),
    }),
  )
  // A second mount with the real allowance shape, only much smaller, so the
  // limiter guarding the password route is covered end to end.
  app.use(
    '/limited/users',
    createUserRouter({
      service,
      authenticationMiddleware,
      originMiddleware,
      writeRateLimitMiddleware: createPropertyWriteRateLimiter({ limit: 1_000 }),
      passwordRateLimitMiddleware: createPasswordChangeRateLimiter({ limit: 2 }),
    }),
  )
  app.use(errorMiddleware)

  const server = app.listen(0)
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })
  baseUrl = `http://127.0.0.1:${server.address().port}`
  closeServer = () =>
    new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
})

after(async () => closeServer())

beforeEach(() => {
  users = new Map([
    [ownerId, ownerRecord()],
    [googleUserId, googleRecord()],
  ])
})

async function request(
  path,
  { method = 'GET', body, token, origin = allowedOrigin } = {},
) {
  const headers = { 'Content-Type': 'application/json' }
  if (origin) headers.Origin = origin
  if (token) headers.Cookie = `${cookieName}=${token}`

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
    setCookie: response.headers.getSetCookie(),
  }
}

const ownerToken = `session-${ownerId}`
const googleToken = `session-${googleUserId}`

test('GET /users/me returns the signed-in profile without the password hash', async () => {
  users.set(ownerId, {
    ...ownerRecord(),
    phone: '+963111222333',
    whatsapp: '+963944123456',
  })

  const response = await request('/api/v1/users/me', { token: ownerToken })

  assert.equal(response.status, 200)
  assert.deepEqual(response.body.data.user, {
    id: ownerId,
    name: 'Owner account',
    email: 'owner@example.invalid',
    phone: '+963111222333',
    whatsapp: '+963944123456',
    role: 'OWNER',
  })
  assert.equal('passwordHash' in response.body.data.user, false)
})

test('GET /users/me requires authentication', async () => {
  const response = await request('/api/v1/users/me')

  assert.equal(response.status, 401)
  assert.equal(response.body.error.code, 'AUTHENTICATION_REQUIRED')
})

test('GET /users/me is open to a plain USER role', async () => {
  const response = await request('/api/v1/users/me', { token: googleToken })

  assert.equal(response.status, 200)
  assert.equal(response.body.data.user.role, 'USER')
})

test('PATCH /users/me updates the name and normalises both numbers', async () => {
  const response = await request('/api/v1/users/me', {
    method: 'PATCH',
    token: ownerToken,
    body: {
      name: '  Updated owner  ',
      phone: '+963 (11) 222-333',
      whatsapp: '0944 123 456',
    },
  })

  assert.equal(response.status, 200)
  assert.deepEqual(response.body.data.user, {
    id: ownerId,
    name: 'Updated owner',
    email: 'owner@example.invalid',
    phone: '+96311222333',
    whatsapp: '0944123456',
    role: 'OWNER',
  })
  assert.equal(users.get(ownerId).name, 'Updated owner')
})

test('PATCH /users/me accepts a single field and clears a number with null', async () => {
  users.set(ownerId, { ...ownerRecord(), phone: '+963111222333' })

  const response = await request('/api/v1/users/me', {
    method: 'PATCH',
    token: ownerToken,
    body: { phone: null },
  })

  assert.equal(response.status, 200)
  assert.equal(response.body.data.user.phone, null)
  assert.equal(response.body.data.user.name, 'Owner account')
})

test('PATCH /users/me rejects an attempt to change the email', async () => {
  const response = await request('/api/v1/users/me', {
    method: 'PATCH',
    token: ownerToken,
    body: { name: 'Renamed', email: 'attacker@example.invalid' },
  })

  assert.equal(response.status, 400)
  assert.equal(response.body.error.code, 'INVALID_REQUEST')
  // Nothing in the body was applied, so the rejected key cannot smuggle a
  // partial update through alongside a valid one.
  assert.equal(users.get(ownerId).email, 'owner@example.invalid')
  assert.equal(users.get(ownerId).name, 'Owner account')
})

test('PATCH /users/me rejects an attempt to change the role', async () => {
  const response = await request('/api/v1/users/me', {
    method: 'PATCH',
    token: ownerToken,
    body: { role: 'ADMIN' },
  })

  assert.equal(response.status, 400)
  assert.equal(response.body.error.code, 'INVALID_REQUEST')
  assert.equal(users.get(ownerId).role, 'OWNER')
})

test('PATCH /users/me rejects invalid profile values', async () => {
  const cases = [
    {},
    { name: '' },
    { name: '   ' },
    { name: 'a'.repeat(161) },
    { name: '<script>alert(1)</script>' },
    { phone: '12345' },
    { phone: '1234567890123456' },
    { whatsapp: 'not a number' },
    { name: null },
  ]

  for (const body of cases) {
    const response = await request('/api/v1/users/me', {
      method: 'PATCH',
      token: ownerToken,
      body,
    })

    assert.equal(response.status, 400, `expected 400 for ${JSON.stringify(body)}`)
    assert.equal(response.body.error.code, 'INVALID_REQUEST')
  }

  assert.equal(users.get(ownerId).name, 'Owner account')
})

test('PATCH /users/me requires authentication', async () => {
  const response = await request('/api/v1/users/me', {
    method: 'PATCH',
    body: { name: 'Anonymous edit' },
  })

  assert.equal(response.status, 401)
  assert.equal(response.body.error.code, 'AUTHENTICATION_REQUIRED')
  assert.equal(users.get(ownerId).name, 'Owner account')
})

test('POST /users/me/password rejects a wrong current password', async () => {
  const response = await request('/api/v1/users/me/password', {
    method: 'POST',
    token: ownerToken,
    body: { current: 'not-the-current-password', new: newPassword },
  })

  assert.equal(response.status, 401)
  assert.equal(response.body.error.code, 'INVALID_CREDENTIALS')
  assert.equal(users.get(ownerId).passwordHash, currentPasswordHash)
})

test('POST /users/me/password enforces the password policy', async () => {
  const cases = [
    { current: currentPassword, new: 'short' },
    { current: currentPassword, new: 'eleven-chars'.slice(0, 11) },
    // A new password identical to the current one changes nothing.
    { current: currentPassword, new: currentPassword },
    { current: '', new: newPassword },
    { new: newPassword },
    { current: currentPassword },
    { current: currentPassword, new: newPassword, userId: ownerId },
  ]

  for (const body of cases) {
    const response = await request('/api/v1/users/me/password', {
      method: 'POST',
      token: ownerToken,
      body,
    })

    assert.equal(response.status, 400, `expected 400 for ${JSON.stringify(body)}`)
    assert.equal(response.body.error.code, 'INVALID_REQUEST')
  }

  assert.equal(users.get(ownerId).passwordHash, currentPasswordHash)
})

test('POST /users/me/password requires authentication', async () => {
  const response = await request('/api/v1/users/me/password', {
    method: 'POST',
    body: { current: currentPassword, new: newPassword },
  })

  assert.equal(response.status, 401)
  assert.equal(response.body.error.code, 'AUTHENTICATION_REQUIRED')
  assert.equal(users.get(ownerId).passwordHash, currentPasswordHash)
})

test('POST /users/me/password replaces the hash and keeps the session valid', async () => {
  const response = await request('/api/v1/users/me/password', {
    method: 'POST',
    token: ownerToken,
    body: { current: currentPassword, new: newPassword },
  })

  assert.equal(response.status, 204)
  // No cookie is reissued and none is cleared: the caller stays signed in.
  assert.deepEqual(response.setCookie, [])

  const stored = users.get(ownerId).passwordHash
  assert.notEqual(stored, currentPasswordHash)
  assert.equal(await verifyPassword(stored, newPassword), true)
  assert.equal(await verifyPassword(stored, currentPassword), false)

  // The same cookie still authenticates afterwards.
  const profile = await request('/api/v1/users/me', { token: ownerToken })
  assert.equal(profile.status, 200)
  assert.equal(profile.body.data.user.id, ownerId)
})

test('POST /users/me/password refuses an account that has no password', async () => {
  const response = await request('/api/v1/users/me/password', {
    method: 'POST',
    token: googleToken,
    body: { current: currentPassword, new: newPassword },
  })

  assert.equal(response.status, 409)
  assert.equal(response.body.error.code, 'PASSWORD_NOT_SET')
})

test('POST /users/me/password is rate limited', async () => {
  const attempt = () =>
    request('/limited/users/me/password', {
      method: 'POST',
      token: ownerToken,
      body: { current: 'not-the-current-password', new: newPassword },
    })

  assert.equal((await attempt()).status, 401)
  assert.equal((await attempt()).status, 401)

  const limited = await attempt()
  assert.equal(limited.status, 429)
  assert.equal(limited.body.error.code, 'PASSWORD_CHANGE_RATE_LIMITED')
})

test('the write routes reject a foreign origin', async () => {
  const response = await request('/api/v1/users/me', {
    method: 'PATCH',
    token: ownerToken,
    body: { name: 'Cross origin' },
    origin: 'https://attacker.example',
  })

  assert.equal(response.status, 403)
  assert.equal(response.body.error.code, 'ORIGIN_DENIED')
})
