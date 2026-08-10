import assert from 'node:assert/strict'
import { test } from 'node:test'

process.env.CORS_ORIGINS = 'http://localhost'

const {
  createAuthenticationService,
  normalizeEmail,
} = await import('../src/services/authentication.service.js')

function createMocks(user) {
  const calls = []
  const userRepository = {
    async findUserForAuthentication(email) {
      calls.push(['findUser', email])
      return user
    },
  }
  const sessionRepository = {
    async createSession(input) {
      calls.push(['createSession', input])
      return {
        id: 'session-id',
        expiresAt: input.expiresAt,
      }
    },
    async findValidSessionByTokenHash(tokenHash, now) {
      calls.push(['findSession', tokenHash, now])
      return null
    },
    async revokeSessionByTokenHash(tokenHash) {
      calls.push(['revokeSession', tokenHash])
      return 1
    },
  }
  const passwordUtility = {
    async verifyPassword(hash, password) {
      calls.push(['verifyPassword', hash, password])
      return hash === 'valid-hash' && password === 'valid-password'
    },
  }
  const sessionTokenUtility = {
    generateSessionToken: () => 'raw-token',
    hashSessionToken: (token) => `hashed:${token}`,
  }

  return {
    calls,
    service: createAuthenticationService({
      userRepository,
      sessionRepository,
      passwordUtility,
      sessionTokenUtility,
      dummyHashProvider: async () => 'dummy-hash',
      now: () => new Date('2026-07-25T12:00:00.000Z'),
      sessionTtlHours: 12,
    }),
    sessionRepository,
  }
}

const activeUser = {
  id: 'user-id',
  email: 'owner@example.invalid',
  name: 'Owner',
  role: 'OWNER',
  passwordHash: 'valid-hash',
  isActive: true,
}

test('normalizes email and returns only public user fields for valid credentials', async () => {
  const { calls, service } = createMocks(activeUser)

  assert.equal(normalizeEmail('  OWNER@Example.Invalid '), 'owner@example.invalid')
  assert.deepEqual(
    await service.verifyCredentials(
      '  OWNER@Example.Invalid ',
      'valid-password',
    ),
    {
      id: 'user-id',
      email: 'owner@example.invalid',
      name: 'Owner',
      role: 'OWNER',
    },
  )
  assert.deepEqual(calls[0], ['findUser', 'owner@example.invalid'])
})

test('uses the same generic error and performs verification for invalid accounts', async (context) => {
  const cases = [
    ['unknown email', null],
    ['null password hash', { ...activeUser, passwordHash: null }],
    ['inactive user', { ...activeUser, isActive: false }],
    ['incorrect password', activeUser],
  ]

  for (const [name, user] of cases) {
    await context.test(name, async () => {
      const { calls, service } = createMocks(user)
      const password = name === 'incorrect password' ? 'wrong' : 'valid-password'

      await assert.rejects(
        service.verifyCredentials('owner@example.invalid', password),
        (error) =>
          error.code === 'INVALID_CREDENTIALS' &&
          error.statusCode === 401 &&
          error.message === 'Invalid email or password.',
      )
      assert.equal(
        calls.filter(([operation]) => operation === 'verifyPassword').length,
        1,
      )
    })
  }
})

test('creates sessions with a 12-hour expiry and returns the raw token only from the service', async () => {
  const { calls, service } = createMocks(activeUser)
  const session = await service.createSession('user-id')

  assert.deepEqual(session, {
    id: 'session-id',
    rawToken: 'raw-token',
    expiresAt: new Date('2026-07-26T00:00:00.000Z'),
  })
  assert.deepEqual(calls[0], [
    'createSession',
    {
      tokenHash: 'hashed:raw-token',
      userId: 'user-id',
      expiresAt: new Date('2026-07-26T00:00:00.000Z'),
    },
  ])
})

test('authenticates active sessions and rejects missing, expired, or inactive sessions', async () => {
  const { service, sessionRepository } = createMocks(activeUser)
  sessionRepository.findValidSessionByTokenHash = async () => ({
    id: 'session-id',
    expiresAt: new Date('2026-07-26T00:00:00.000Z'),
    user: {
      id: 'user-id',
      name: 'Owner',
      role: 'OWNER',
      isActive: true,
    },
  })

  assert.deepEqual(await service.authenticateSession('raw-token'), {
    id: 'session-id',
    expiresAt: new Date('2026-07-26T00:00:00.000Z'),
    user: {
      id: 'user-id',
      name: 'Owner',
      role: 'OWNER',
    },
  })

  sessionRepository.findValidSessionByTokenHash = async () => null
  assert.equal(await service.authenticateSession('raw-token'), null)

  sessionRepository.findValidSessionByTokenHash = async () => ({
    id: 'session-id',
    expiresAt: new Date('2026-07-26T00:00:00.000Z'),
    user: { id: 'user-id', name: 'Owner', role: 'OWNER', isActive: false },
  })
  assert.equal(await service.authenticateSession('raw-token'), null)
  assert.equal(await service.authenticateSession(''), null)
})

test('revokes sessions by a hash of the raw token', async () => {
  const { calls, service } = createMocks(activeUser)

  assert.equal(await service.revokeSession('raw-token'), 1)
  assert.deepEqual(calls[0], ['revokeSession', 'hashed:raw-token'])
  assert.equal(await service.revokeSession(''), 0)
})
