import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createAuthCookieManager } from '../src/utils/auth-cookie.js'

function requestWith(cookieHeader) {
  return { headers: cookieHeader === undefined ? {} : { cookie: cookieHeader } }
}

function recordingResponse() {
  const calls = { cookie: [], clearCookie: [] }
  return {
    calls,
    cookie(name, value, options) {
      calls.cookie.push({ name, value, options })
    },
    clearCookie(name, options) {
      calls.clearCookie.push({ name, options })
    },
  }
}

test('reads the session cookie out of a header carrying several cookies', () => {
  const manager = createAuthCookieManager({ name: 'sess' })

  // The target is not the first cookie, so the name comparison has to do real
  // work, and `; ` separation leaves the second name with a leading space that
  // only trimming removes.
  assert.equal(
    manager.read(requestWith('other=wrong; sess=right; last=no')),
    'right',
  )
  assert.equal(manager.read(requestWith('sess=only')), 'only')
  assert.equal(manager.read(requestWith('  sess  =  padded  ')), 'padded')
})

test('returns null when no usable session cookie is present', () => {
  const manager = createAuthCookieManager({ name: 'sess' })

  assert.equal(manager.read(requestWith(undefined)), null)
  assert.equal(manager.read(requestWith('')), null)
  assert.equal(manager.read(requestWith('other=value')), null)
  // Present but empty: an empty token is never a session.
  assert.equal(manager.read(requestWith('sess=')), null)
  assert.equal(manager.read(requestWith('sess=   ')), null)
})

test('ignores malformed segments instead of reading a name out of them', () => {
  const manager = createAuthCookieManager({ name: 'sess' })

  // `sessX` has no `=` at all. Treating the last character as the separator
  // would turn it into a cookie named `sess`, shadowing the real one.
  assert.equal(manager.read(requestWith('sessX; sess=real')), 'real')
  assert.equal(manager.read(requestWith('sessX')), null)
  // A segment that begins with `=` has an empty name and is not this cookie.
  assert.equal(manager.read(requestWith('=orphan; sess=real')), 'real')
})

test('percent-decodes the token and abandons the read on a bad encoding', () => {
  const manager = createAuthCookieManager({ name: 'sess' })

  assert.equal(manager.read(requestWith('sess=a%20b')), 'a b')

  // A malformed escape stops the read outright. Swallowing the failure and
  // carrying on would let a later duplicate of the same name be accepted.
  assert.equal(manager.read(requestWith('sess=%E0%A4%A; sess=good')), null)
  assert.equal(manager.read(requestWith('sess=%')), null)
})

test('sets the session cookie with the hardened options and a clamped max age', () => {
  const now = new Date('2026-01-01T00:00:00.000Z')
  const manager = createAuthCookieManager({
    name: 'sess',
    secure: true,
    now: () => now,
  })
  const response = recordingResponse()

  manager.set(response, 'raw-token', new Date(now.getTime() + 3600_000))

  const [call] = response.calls.cookie
  assert.equal(call.name, 'sess')
  assert.equal(call.value, 'raw-token')
  assert.equal(call.options.httpOnly, true)
  assert.equal(call.options.secure, true)
  assert.equal(call.options.path, '/')
  assert.equal(call.options.maxAge, 3600_000)

  // An already-expired session must not produce a negative max age, which a
  // browser reads as a session cookie rather than an expired one.
  manager.set(response, 'raw-token', new Date(now.getTime() - 5000))
  assert.equal(response.calls.cookie[1].options.maxAge, 0)
})

test('clears the session cookie with the same options minus the max age', () => {
  const manager = createAuthCookieManager({ name: 'sess', secure: true })
  const response = recordingResponse()

  manager.clear(response)

  const [call] = response.calls.clearCookie
  assert.equal(call.name, 'sess')
  assert.equal(call.options.httpOnly, true)
  assert.equal(call.options.secure, true)
  assert.equal(call.options.path, '/')
  assert.equal(call.options.maxAge, undefined)
})

test('exposes the configured cookie name', () => {
  assert.equal(createAuthCookieManager({ name: 'custom_name' }).name, 'custom_name')
})
