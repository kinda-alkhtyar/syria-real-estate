import env from '../config/env.js'
import authenticationService from '../services/authentication.service.js'
import authCookieManager from '../utils/auth-cookie.js'
import { googleLoginSchema, loginSchema } from '../validation/auth.schema.js'

function validationError(result) {
  const error = new Error(
    result.error.issues
      .map((issue) => `${issue.path.join('.') || 'request'}: ${issue.message}`)
      .join('; '),
  )
  error.code = 'INVALID_REQUEST'
  error.statusCode = 400
  return error
}

function configurationMissingError() {
  const error = new Error('Google sign-in is not configured.')
  error.code = 'CONFIGURATION_MISSING'
  error.statusCode = 503
  return error
}

export function createAuthController({
  service = authenticationService,
  cookieManager = authCookieManager,
  googleClientId = () => env.googleClientId,
} = {}) {
  return {
    async login(request, response) {
      const result = loginSchema.safeParse(request.body)

      if (!result.success) {
        throw validationError(result)
      }

      const user = await service.verifyCredentials(
        result.data.email,
        result.data.password,
      )
      const session = await service.createSession(user.id)
      cookieManager.set(response, session.rawToken, session.expiresAt)

      response.status(200).json({
        data: {
          user,
        },
      })
    },

    async googleLogin(request, response) {
      // Checked before parsing so an unconfigured deployment never reaches
      // Google and never hints at what a valid body would look like.
      if (!googleClientId()) {
        throw configurationMissingError()
      }

      const result = googleLoginSchema.safeParse(request.body)

      if (!result.success) {
        throw validationError(result)
      }

      const user = await service.authenticateWithGoogle(
        result.data.credential,
      )
      const session = await service.createSession(user.id)
      cookieManager.set(response, session.rawToken, session.expiresAt)

      response.status(200).json({
        data: {
          user,
        },
      })
    },

    async logout(request, response) {
      const rawToken = cookieManager.read(request)

      if (rawToken) {
        await service.revokeSession(rawToken)
      }

      cookieManager.clear(response)
      response.status(204).end()
    },

    me(request, response) {
      response.status(200).json({
        data: {
          user: request.auth.user,
        },
      })
    },
  }
}

const authController = createAuthController()

export const { googleLogin, login, logout, me } = authController
