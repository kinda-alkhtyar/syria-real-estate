import prisma from '../config/database.js'

const authorizationUserSelect = {
  id: true,
  name: true,
  role: true,
  isActive: true,
}

export function createAuthSessionRepository(database = prisma) {
  return {
    createSession({ tokenHash, userId, expiresAt }) {
      return database.authSession.create({
        data: {
          tokenHash,
          userId,
          expiresAt,
        },
        select: {
          id: true,
          createdAt: true,
          expiresAt: true,
        },
      })
    },

    findValidSessionByTokenHash(tokenHash, now = new Date()) {
      return database.authSession.findFirst({
        where: {
          tokenHash,
          expiresAt: { gt: now },
        },
        select: {
          id: true,
          expiresAt: true,
          user: {
            select: authorizationUserSelect,
          },
        },
      })
    },

    async revokeSessionByTokenHash(tokenHash) {
      const result = await database.authSession.deleteMany({
        where: { tokenHash },
      })
      return result.count
    },

    async revokeAllSessionsForUser(userId) {
      const result = await database.authSession.deleteMany({
        where: { userId },
      })
      return result.count
    },

    async deleteExpiredSessions(now = new Date()) {
      const result = await database.authSession.deleteMany({
        where: {
          expiresAt: { lte: now },
        },
      })
      return result.count
    },
  }
}

const authSessionRepository = createAuthSessionRepository()

export const {
  createSession,
  deleteExpiredSessions,
  findValidSessionByTokenHash,
  revokeAllSessionsForUser,
  revokeSessionByTokenHash,
} = authSessionRepository
