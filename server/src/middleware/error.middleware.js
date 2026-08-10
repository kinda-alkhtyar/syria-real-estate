import logger from '../observability/logger.js'
import operationalMetrics from '../observability/metrics.js'

const knownCode = /^[A-Z][A-Z0-9_]{0,63}$/

// express.json rejects a payload before any route runs. Its errors carry a
// `type` but no `code`, so without this map they would reach the client as
// INTERNAL_SERVER_ERROR wrapped around body-parser's own wording.
const bodyParserFailures = new Map([
  [
    'entity.parse.failed',
    {
      code: 'INVALID_REQUEST',
      message: 'The request body is not valid JSON.',
      statusCode: 400,
    },
  ],
  [
    'entity.too.large',
    {
      code: 'PAYLOAD_TOO_LARGE',
      message: 'The request body is too large.',
      statusCode: 413,
    },
  ],
])

const stackFrame = /^\s+at\s/
const maximumStackFrames = 20

/**
 * The frame list of a stack, without its first line. That line repeats
 * error.message, which for a database or storage failure can quote a
 * connection string or a submitted value. Frames locate the failure without
 * echoing anything the request supplied.
 */
export function stackFrames(error) {
  if (typeof error?.stack !== 'string') return undefined

  const frames = error.stack
    .split('\n')
    .filter((line) => stackFrame.test(line))
    .slice(0, maximumStackFrames)
    .map((line) => line.trim())

  return frames.length > 0 ? frames.join(' | ') : undefined
}

export function categorizeError(error, statusCode) {
  if (statusCode === 401) return 'authentication'
  if (statusCode === 403) return 'authorization'
  if (statusCode === 404) return 'not_found'
  if (statusCode === 429) return 'rate_limit'
  if (
    (error?.code?.startsWith('P') && /^P\d{4}$/.test(error.code)) ||
    error?.name?.startsWith('Prisma') ||
    typeof error?.meta?.modelName === 'string'
  ) {
    return 'database'
  }
  if (error?.code?.startsWith('STORAGE_')) return 'storage'
  if (statusCode >= 500) return 'internal'
  return 'request'
}

export function createErrorMiddleware({
  log = logger,
  metrics = operationalMetrics,
} = {}) {
  return function errorMiddleware(error, request, response, next) {
    if (response.headersSent) {
      next(error)
      return
    }

    const parserFailure =
      typeof error.type === 'string'
        ? bodyParserFailures.get(error.type)
        : undefined
    const statusCode =
      parserFailure?.statusCode ??
      (Number.isInteger(error.statusCode) && error.statusCode >= 400
        ? error.statusCode
        : 500)
    const isServerError = statusCode >= 500
    const category = categorizeError(error, statusCode)
    const code =
      parserFailure?.code ??
      (typeof error.code === 'string' && knownCode.test(error.code)
        ? error.code
        : 'INTERNAL_SERVER_ERROR')
    const message =
      parserFailure?.message ??
      (isServerError ? 'An unexpected error occurred.' : error.message)

    if (category === 'database') metrics.recordDatabaseQueryFailure()
    if (statusCode === 401) metrics.recordAuthenticationFailure()
    if (
      statusCode >= 400 &&
      request.method === 'POST' &&
      request.observabilityBase === '/api/v1/properties' &&
      request.path.includes('/images')
    ) {
      metrics.recordImageUploadFailure()
    }

    const fields = {
      category,
      code,
      method: request.method,
      requestId: request.id,
      route:
        typeof request.route?.path === 'string'
          ? `${request.observabilityBase ?? ''}${request.route.path}`
          : 'unmatched',
      status: statusCode,
    }
    // The client only ever sees the generic sentence above, so the frames are
    // the sole record of where a 5xx came from.
    if (isServerError) {
      const frames = stackFrames(error)
      if (frames) fields.stack = frames
    }

    log.error('request_failed', fields)

    response.status(statusCode).json({
      error: {
        code,
        message,
        requestId: request.id,
      },
    })
  }
}

const errorMiddleware = createErrorMiddleware()

export default errorMiddleware
