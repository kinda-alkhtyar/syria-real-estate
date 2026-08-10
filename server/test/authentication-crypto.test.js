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
