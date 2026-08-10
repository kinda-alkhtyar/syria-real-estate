import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createAuthSessionRepository } from '../src/repositories/auth-session.repository.js'

test('AuthSession repository builds bounded Prisma operations', async () => {
  const calls = []
  const database = {
    authSession: {
      create: async (args) => {
        calls.push(['create', args])
        return { id: 'session-id' }
      },
      findFirst: async (args) => {
        calls.push(['findFirst', args])
        return null
      },
      deleteMany: async (args) => {
        calls.push(['deleteMany', args])
        return { count: 1 }
      },
    },
  }
  const repository = createAuthSessionRepository(database)
  const now = new Date('2026-07-25T12:00:00.000Z')
  const expiresAt = new Date('2026-07-26T00:00:00.000Z')

  await repository.createSession({
    tokenHash: 'token-hash',
    userId: 'user-id',
    expiresAt,
  })
  await repository.findValidSessionByTokenHash('token-hash', now)
  assert.equal(await repository.revokeSessionByTokenHash('token-hash'), 1)
  assert.equal(await repository.revokeAllSessionsForUser('user-id'), 1)
  assert.equal(await repository.deleteExpiredSessions(now), 1)

  assert.deepEqual(calls[0][1].data, {
    tokenHash: 'token-hash',
    userId: 'user-id',
    expiresAt,
  })
  assert.deepEqual(calls[1][1].where, {
    tokenHash: 'token-hash',
    expiresAt: { gt: now },
  })
  assert.deepEqual(calls[2][1].where, { tokenHash: 'token-hash' })
  assert.deepEqual(calls[3][1].where, { userId: 'user-id' })
  assert.deepEqual(calls[4][1].where, { expiresAt: { lte: now } })
  assert.deepEqual(
    Object.keys(calls[1][1].select.user.select).sort(),
    ['id', 'isActive', 'name', 'role'],
  )
})
