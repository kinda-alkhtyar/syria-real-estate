import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  argon2idParameters,
  hashPassword,
  maximumPasswordBytes,
  verifyPassword,
} from '../src/utils/password.js'
import {
  generateSessionToken,
  hashSessionToken,
  sessionTokenHashesEqual,
} from '../src/utils/session-token.js'

test('hashes and verifies passwords with the configured Argon2id parameters', async () => {
  const hash = await hashPassword('correct horse battery staple')

  assert.match(hash, /^\$argon2id\$/)
  assert.match(hash, new RegExp(`m=${argon2idParameters.memoryCost}`))
  assert.match(hash, new RegExp(`t=${argon2idParameters.timeCost}`))
  assert.match(hash, new RegExp(`p=${argon2idParameters.parallelism}`))
  assert.equal(await verifyPassword(hash, 'correct horse battery staple'), true)
  assert.equal(await verifyPassword(hash, 'incorrect'), false)
  assert.equal(await verifyPassword('not-an-argon-hash', 'password'), false)
})

test('rejects passwords beyond the UTF-8 byte limit', async () => {
  const oversizedPassword = 'a'.repeat(maximumPasswordBytes + 1)

  assert.throws(() => hashPassword(oversizedPassword), RangeError)
  assert.equal(await verifyPassword('unused', oversizedPassword), false)
})

test('generates 256-bit cookie-safe tokens and deterministic SHA-256 hashes', () => {
  const firstToken = generateSessionToken()
  const secondToken = generateSessionToken()
  const firstHash = hashSessionToken(firstToken)

  assert.equal(Buffer.from(firstToken, 'base64url').length, 32)
  assert.match(firstToken, /^[A-Za-z0-9_-]+$/)
  assert.notEqual(firstToken, secondToken)
  assert.match(firstHash, /^[a-f0-9]{64}$/)
  assert.equal(firstHash, hashSessionToken(firstToken))
  assert.equal(sessionTokenHashesEqual(firstHash, firstHash), true)
  assert.equal(
    sessionTokenHashesEqual(firstHash, hashSessionToken(secondToken)),
    false,
  )
})

test('refuses to hash anything that is not a non-empty string', () => {
  const message = 'Session token must be a non-empty string.'

  // The empty string is the case that matters: it is falsy but still a string,
  // so a guard joined with `&&` instead of `||` would hash it happily.
  assert.throws(() => hashSessionToken(''), { name: 'TypeError', message })
  assert.throws(() => hashSessionToken(null), { name: 'TypeError', message })
  assert.throws(
    () => hashSessionToken(undefined),
    { name: 'TypeError', message },
  )
  assert.throws(
    () => hashSessionToken(Buffer.from('token')),
    { name: 'TypeError', message },
  )
})

test('compares session token hashes only as fully anchored 64-character hex', () => {
  const hash = hashSessionToken(generateSessionToken())
  const other = hashSessionToken(generateSessionToken())

  // The hex alphabet is case-insensitive, so an equal hash in either case is
  // still equal.
  assert.equal(sessionTokenHashesEqual(hash.toUpperCase(), hash), true)
  assert.equal(sessionTokenHashesEqual(hash, other), false)

  // Both anchors carry weight: an unanchored pattern would accept a hash
  // carrying a prefix or a suffix and compare the 64 characters it found.
  assert.equal(sessionTokenHashesEqual(`z${hash}`, hash), false)
  assert.equal(sessionTokenHashesEqual(`${hash}z`, hash), false)
  assert.equal(sessionTokenHashesEqual(hash, `${hash}z`), false)
  assert.equal(sessionTokenHashesEqual(hash.slice(0, 63), hash), false)
  assert.equal(sessionTokenHashesEqual(`${hash.slice(0, 63)}g`, hash), false)

  // A String object stringifies to a valid hash and would pass a pattern test,
  // so the `typeof` guards are what keep a non-primitive out.
  assert.equal(sessionTokenHashesEqual(new String(hash), hash), false)
  assert.equal(sessionTokenHashesEqual(hash, new String(hash)), false)
  assert.equal(sessionTokenHashesEqual(null, hash), false)
  assert.equal(sessionTokenHashesEqual(hash, undefined), false)
})
