import prisma from '../config/database.js'
import applicationLifecycle from '../observability/lifecycle.js'
import logger from '../observability/logger.js'
import operationalMetrics from '../observability/metrics.js'

const readinessTimeoutMs = 2_000

// A probe endpoint carries no rate limit, so its database round trip is capped
// here instead: one `SELECT 1` per second at most, however fast probes arrive.
const readinessCacheTtlMs = 1_000

function withTimeout(promise, timeoutMs) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Readiness check timed out.')), timeoutMs)
    timer.unref?.()
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

export function createHealthController({
  cacheTtlMs = readinessCacheTtlMs,
  database = prisma,
  lifecycle = applicationLifecycle,
  log = logger,
  metrics = operationalMetrics,
  now = Date.now,
  timeoutMs = readinessTimeoutMs,
} = {}) {
  let cachedReady = false
  let cachedUntil = 0
  let inFlight = null

  /**
   * Resolves to the database's readiness, reusing a result for `cacheTtlMs`
   * and letting concurrent probes share one query. A failure is recorded and
   * logged once per query executed, not once per probe received.
   */
  function probeDatabase(request) {
    if (now() < cachedUntil) return Promise.resolve(cachedReady)
    if (inFlight) return inFlight

    inFlight = (async () => {
      try {
        await withTimeout(database.$queryRaw`SELECT 1`, timeoutMs)
        cachedReady = true
      } catch {
        metrics.recordDatabaseQueryFailure()
        log.error('readiness_failed', {
          category: 'database',
          component: 'readiness',
          requestId: request?.id,
          status: 503,
        })
        cachedReady = false
      } finally {
        cachedUntil = now() + cacheTtlMs
        inFlight = null
      }
      return cachedReady
    })()

    return inFlight
  }

  return {
    getHealth(_request, response) {
      response.status(200).json({ status: 'ok' })
    },

    async getReadiness(request, response) {
      if (lifecycle.isShuttingDown()) {
        response.status(503).json({ status: 'not_ready' })
        return
      }

      if (await probeDatabase(request)) {
        response.status(200).json({ status: 'ready' })
        return
      }
      response.status(503).json({ status: 'not_ready' })
    },
  }
}

const healthController = createHealthController()

export const { getHealth, getReadiness } = healthController
