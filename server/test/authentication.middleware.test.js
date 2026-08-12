import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  createRequireAuthentication,
  requireRole,
} from '../src/middleware/authentication.middleware.js'

function captureNext() {
  const calls = []
  const next = (error) => calls.push(error)
  next.calls = calls
  return next
}

const activeSession = {
  id: 'session-1',
  expiresAt: new Date('2026-01-01T00:00:00.000Z'),
  user: { id: 'user-1', name: 'Layla', role: 'OWNER' },
}

function guardWith({ rawToken = 'raw', session = activeSession, error } = {}) {
  return createRequireAuthentication({
    cookieManager: { read: () => rawToken },
    service: {
      authenticateSession: async () => {
        if (error) throw error
        return session
      },
    },
  })
}

test('attaches a frozen auth context for a valid session', async () => {
  const request = {}
  const next = captureNext()

  await guardWith()(request, {}, next)

  assert.deepEqual(next.calls, [undefined])
  assert.equal(request.auth.sessionId, 'session-1')
  assert.equal(request.auth.expiresAt, activeSession.expiresAt)
  assert.deepEqual(request.auth.user, {
    id: 'user-1',
    name: 'Layla',
    role: 'OWNER',
  })
  assert.equal(Object.isFrozen(request.auth), true)
  assert.equal(Object.isFrozen(request.auth.user), true)
})

test('rejects a missing cookie or an unusable session without touching the request', async () => {
  for (const options of [
    { rawToken: null },
    { rawToken: '' },
    { session: null },
  ]) {
    const request = {}
    const next = captureNext()

    await guardWith(options)(request, {}, next)

    assert.equal(next.calls.length, 1)
    assert.equal(next.calls[0].code, 'AUTHENTICATION_REQUIRED')
    assert.equal(next.calls[0].statusCode, 401)
    assert.equal(next.calls[0].message, 'Authentication is required.')
    assert.equal(request.auth, undefined)
  }
})

test('forwards an unexpected session lookup failure to the error handler', async () => {
  const failure = new Error('session store unreachable')
  const request = {}
  const next = captureNext()

  await guardWith({ error: failure })(request, {}, next)

  assert.deepEqual(next.calls, [failure])
  assert.equal(request.auth, undefined)
})

test('refuses to build a role guard from an empty or unknown role list', () => {
  const message = 'requireRole requires one or more valid user roles.'

  assert.throws(() => requireRole(), { name: 'TypeError', message })
  assert.throws(() => requireRole('MODERATOR'), { name: 'TypeError', message })
  assert.throws(() => requireRole('ADMIN', 'ROOT'), {
    name: 'TypeError',
    message,
  })
  assert.throws(() => requireRole('admin'), { name: 'TypeError', message })
})

test('admits every listed role and denies the rest', () => {
  const guard = requireRole('ADMIN', 'OWNER')

  for (const role of ['ADMIN', 'OWNER']) {
    const next = captureNext()
    guard({ auth: { user: { role } } }, {}, next)
    assert.deepEqual(next.calls, [undefined])
  }

  const next = captureNext()
  guard({ auth: { user: { role: 'USER' } } }, {}, next)
  assert.equal(next.calls[0].code, 'FORBIDDEN')
  assert.equal(next.calls[0].statusCode, 403)
  assert.equal(
    next.calls[0].message,
    'You are not allowed to perform this action.',
  )
})

test('reports an unauthenticated caller as 401 rather than 403', () => {
  const next = captureNext()

  // The role guard can be reached without the authentication guard having run,
  // and an anonymous caller has been denied nothing yet — they have not
  // identified themselves.
  requireRole('ADMIN')({}, {}, next)

  assert.equal(next.calls[0].code, 'AUTHENTICATION_REQUIRED')
  assert.equal(next.calls[0].statusCode, 401)
  assert.equal(next.calls[0].message, 'Authentication is required.')
})
