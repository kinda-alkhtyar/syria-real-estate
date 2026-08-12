import env from '../config/env.js'
import logger from './logger.js'

// server.js owns what happens after a fatal error: it logs, stops accepting
// connections, drains what is in flight and exits non-zero. Sentry's own
// handlers install a second policy on the same two events, so they are dropped
// and the captures below are made by hand instead.
const fatalIntegrations = new Set(['OnUncaughtException', 'OnUnhandledRejection'])

/**
 * Optional error monitoring. With SENTRY_DSN empty the SDK is never imported,
 * never initialised, and every method here returns immediately — the process
 * behaves exactly as it did before this file existed. That is the default, and
 * it is what every existing deployment and the whole test suite run with.
 *
 * Nothing in here can throw: a monitoring backend that is misconfigured, down,
 * or rejecting events must never turn into a failure of the request that was
 * being reported.
 */
export function createErrorReporter({
  dsn = env.sentryDsn,
  environment = env.nodeEnv,
  loadSdk = () => import('@sentry/node'),
  log = logger,
} = {}) {
  const configured = Boolean(dsn)
  let sdk = null

  return {
    configured,

    isInitialized() {
      return sdk !== null
    },

    /**
     * Resolves to whether reporting is live. Called once at startup; the import
     * is dynamic so an unconfigured deployment never pays to load the SDK.
     */
    async initialize() {
      if (!configured || sdk !== null) return false

      try {
        const sentry = await loadSdk()
        sentry.init({
          dsn,
          environment,
          integrations: (defaults) =>
            defaults.filter(
              (integration) => !fatalIntegrations.has(integration.name),
            ),
        })
        sdk = sentry
        log.info('error_reporter_started', { component: 'sentry' })
        return true
      } catch (error) {
        // The DSN is not logged: it carries the ingest key.
        log.error('error_reporter_init_failed', {
          component: 'sentry',
          category: error?.name ?? 'Error',
        })
        return false
      }
    },

    /**
     * Tags the event with the request id already on the log line, so an event
     * in Sentry and the JSON log of the same failure can be lined up. Only the
     * fields the logger itself allows are attached — the error message and
     * anything the request supplied stay out, for the reason given in
     * stackFrames in error.middleware.js.
     */
    captureException(error, { level, requestId, ...fields } = {}) {
      if (sdk === null) return false

      try {
        sdk.withScope((scope) => {
          if (typeof requestId === 'string') scope.setTag('request_id', requestId)
          if (typeof level === 'string') scope.setLevel(level)
          for (const [name, value] of Object.entries(fields)) {
            if (['string', 'number'].includes(typeof value)) {
              scope.setTag(name, value)
            }
          }
          sdk.captureException(error)
        })
        return true
      } catch {
        return false
      }
    },
  }
}

const errorReporter = createErrorReporter()

export default errorReporter
