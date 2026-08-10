import logger from '../observability/logger.js'
import operationalMetrics from '../observability/metrics.js'

function routeName(request) {
  const routePath = request.route?.path
  if (typeof routePath === 'string') {
    return `${request.observabilityBase ?? ''}${routePath}`
  }
  return 'unmatched'
}

export function createRouteContext(base) {
  return function routeContext(request, _response, next) {
    request.observabilityBase = base
    next()
  }
}

export function createRequestObservability({
  log = logger,
  metrics = operationalMetrics,
  now = process.hrtime.bigint,
} = {}) {
  return function requestObservability(request, response, next) {
    const startedAt = now()

    response.once('finish', () => {
      try {
        const durationMs = Number(now() - startedAt) / 1_000_000
        const fields = {
          durationMs: Number(durationMs.toFixed(2)),
          method: request.method,
          requestId: request.id,
          route: routeName(request),
          status: response.statusCode,
        }
        metrics.recordRequest({
          durationMs,
          statusCode: response.statusCode,
        })
        log.info('request_completed', fields)
      } catch {
        // Metrics and logging cannot make a completed request fail.
      }
    })

    next()
  }
}

const requestObservability = createRequestObservability()

export default requestObservability
