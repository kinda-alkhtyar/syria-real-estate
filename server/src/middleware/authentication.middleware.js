import { UserRole } from '../generated/prisma/client.ts'
import authenticationService from '../services/authentication.service.js'
import authCookieManager from '../utils/auth-cookie.js'

function authenticationRequiredError() {
  const error = new Error('Authentication is required.')
  error.code = 'AUTHENTICATION_REQUIRED'
  error.statusCode = 401
  return error
}

function forbiddenError() {
  const error = new Error('You are not allowed to perform this action.')
  error.code = 'FORBIDDEN'
  error.statusCode = 403
  return error
}

export function createRequireAuthentication({
  service = authenticationService,
  cookieManager = authCookieManager,
} = {}) {
  return async function requireAuthentication(request, _response, next) {
    try {
      const rawToken = cookieManager.read(request)
      const session = rawToken
        ? await service.authenticateSession(rawToken)
        : null

      if (!session) {
        next(authenticationRequiredError())
        return
      }

      request.auth = Object.freeze({
        sessionId: session.id,
        expiresAt: session.expiresAt,
        user: Object.freeze({
          id: session.user.id,
          name: session.user.name,
          role: session.user.role,
        }),
      })
      next()
    } catch (error) {
      next(error)
    }
  }
}

export function requireRole(...roles) {
  const knownRoles = new Set(Object.values(UserRole))

  if (
    roles.length === 0 ||
    roles.some((role) => !knownRoles.has(role))
  ) {
    throw new TypeError('requireRole requires one or more valid user roles.')
  }

  const allowedRoles = new Set(roles)

  return function authorizeRole(request, _response, next) {
    if (!request.auth) {
      next(authenticationRequiredError())
      return
    }

    if (!allowedRoles.has(request.auth.user.role)) {
      next(forbiddenError())
      return
    }

    next()
  }
}

export const requireAuthentication = createRequireAuthentication()
