import { randomBytes } from 'node:crypto'

import env from '../config/env.js'
import { recordFailedLoginAttempt } from '../middleware/login-rate-limit.middleware.js'
import {
  createSession as createSessionRecord,
  findValidSessionByTokenHash,
  revokeSessionByTokenHash,
} from '../repositories/auth-session.repository.js'
import {
  createGoogleUser,
  findUserByGoogleSub,
  findUserForAuthentication,
  linkGoogleAccount,
} from '../repositories/user.repository.js'
import { normalizeEmail } from '../utils/email.js'
import { verifyGoogleIdToken } from '../utils/google-token.js'
import { hashPassword, verifyPassword } from '../utils/password.js'
import {
  generateSessionToken,
  hashSessionToken,
} from '../utils/session-token.js'

const millisecondsPerHour = 60 * 60 * 1000

export { normalizeEmail } from '../utils/email.js'

export function invalidCredentialsError() {
  const error = new Error('Invalid email or password.')
  error.code = 'INVALID_CREDENTIALS'
  error.statusCode = 401
  return error
}

let dummyPasswordHashPromise

function getDummyPasswordHash() {
  dummyPasswordHashPromise ??= hashPassword(
    randomBytes(32).toString('base64url'),
  )
  return dummyPasswordHashPromise
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  }
}

export function disabledAccountError() {
  const error = new Error('This account is not active.')
  error.code = 'ACCOUNT_DISABLED'
  error.statusCode = 403
  return error
}

export function createAuthenticationService({
  userRepository = {
    createGoogleUser,
    findUserByGoogleSub,
    findUserForAuthentication,
    linkGoogleAccount,
  },
  sessionRepository = {
    createSession: createSessionRecord,
    findValidSessionByTokenHash,
    revokeSessionByTokenHash,
  },
  passwordUtility = { verifyPassword },
  sessionTokenUtility = { generateSessionToken, hashSessionToken },
  dummyHashProvider = getDummyPasswordHash,
  onFailedCredentials = recordFailedLoginAttempt,
  googleVerifier = verifyGoogleIdToken,
  googleUserRole = 'OWNER',
  now = () => new Date(),
  sessionTtlHours = env.authSessionTtlHours,
} = {}) {
  return {
    async verifyCredentials(email, password) {
      const user = await userRepository.findUserForAuthentication(
        normalizeEmail(email),
      )
      const passwordHash = user?.passwordHash ?? (await dummyHashProvider())
      const passwordMatches = await passwordUtility.verifyPassword(
        passwordHash,
        password,
      )

      if (
        !user ||
        !user.passwordHash ||
        !user.isActive ||
        !passwordMatches
      ) {
        // Counted per account so IP rotation cannot spread the attempts out.
        // Every failure reason feeds the same counter, so the count itself
        // reveals nothing about whether the account exists.
        onFailedCredentials(email)
        throw invalidCredentialsError()
      }

      return publicUser(user)
    },

    /**
     * Exchanges a verified Google ID token for an application user.
     *
     * Resolution order is deliberate: the Google subject is the only stable
     * identifier, so it wins. Falling back to the verified email address links
     * an existing password account instead of creating a duplicate, and it is
     * only safe because the verifier already required `email_verified`.
     */
    async authenticateWithGoogle(credential) {
      const identity = await googleVerifier(credential)
      const email = normalizeEmail(identity.email)

      const linked = await userRepository.findUserByGoogleSub(
        identity.googleSub,
      )
      if (linked) {
        if (!linked.isActive) throw disabledAccountError()
        return publicUser(linked)
      }

      const existing = await userRepository.findUserForAuthentication(email)
      if (existing) {
        if (!existing.isActive) throw disabledAccountError()
        const updated = await userRepository.linkGoogleAccount(
          existing.id,
          identity.googleSub,
        )
        return publicUser(updated ?? existing)
      }

      const created = await userRepository.createGoogleUser({
        email,
        googleSub: identity.googleSub,
        name: identity.name,
        role: googleUserRole,
      })

      return publicUser(created)
    },

    async createSession(userId) {
      const rawToken = sessionTokenUtility.generateSessionToken()
      const tokenHash = sessionTokenUtility.hashSessionToken(rawToken)
      const issuedAt = now()
      const expiresAt = new Date(
        issuedAt.getTime() + sessionTtlHours * millisecondsPerHour,
      )
      const session = await sessionRepository.createSession({
        tokenHash,
        userId,
        expiresAt,
      })

      return {
        id: session.id,
        rawToken,
        expiresAt: session.expiresAt,
      }
    },

    async authenticateSession(rawToken) {
      if (typeof rawToken !== 'string' || rawToken.length === 0) {
        return null
      }

      const tokenHash = sessionTokenUtility.hashSessionToken(rawToken)
      const session = await sessionRepository.findValidSessionByTokenHash(
        tokenHash,
        now(),
      )

      if (!session || !session.user.isActive) {
        return null
      }

      return {
        id: session.id,
        expiresAt: session.expiresAt,
        user: {
          id: session.user.id,
          name: session.user.name,
          role: session.user.role,
        },
      }
    },

    async revokeSession(rawToken) {
      if (typeof rawToken !== 'string' || rawToken.length === 0) {
        return 0
      }

      return sessionRepository.revokeSessionByTokenHash(
        sessionTokenUtility.hashSessionToken(rawToken),
      )
    },
  }
}

const authenticationService = createAuthenticationService()

export const {
  authenticateSession,
  authenticateWithGoogle,
  createSession,
  revokeSession,
  verifyCredentials,
} = authenticationService

export default authenticationService
