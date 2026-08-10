import env from '../config/env.js'

function originError(code, message) {
  const error = new Error(message)
  error.code = code
  error.statusCode = 403
  return error
}

export function createRequireAllowedOrigin(
  allowedOrigins = env.corsOrigins,
) {
  const allowed = new Set(allowedOrigins)

  return function requireAllowedOrigin(request, _response, next) {
    const origin = request.get('Origin')

    if (!origin) {
      next(
        originError(
          'ORIGIN_REQUIRED',
          'A trusted request origin is required.',
        ),
      )
      return
    }

    if (!allowed.has(origin)) {
      next(
        originError(
          'ORIGIN_DENIED',
          'The request origin is not allowed.',
        ),
      )
      return
    }

    next()
  }
}

export const requireAllowedOrigin = createRequireAllowedOrigin()
