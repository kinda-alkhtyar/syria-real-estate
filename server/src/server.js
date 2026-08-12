import app from './app.js'
import env, { productionConfigurationWarnings } from './config/env.js'
import prisma from './config/database.js'
import { stackFrames } from './middleware/error.middleware.js'
import logger from './observability/logger.js'
import { createGracefulShutdown } from './utils/graceful-shutdown.js'
import { createExpiredSessionCleanup } from './utils/session-cleanup.js'

for (const code of productionConfigurationWarnings(env)) {
  logger.warn('configuration_warning', { code, component: 'server' })
}

const httpServer = app.listen(env.port, () => {
  logger.info('server_started', { component: 'server', status: 200 })
})

// A 4 GB video needs far longer to arrive on a slow connection than Node's
// five-minute default allows, so the request timeout is sized for the upload
// cap while the header timeout stays short. headersTimeout must stay above
// keepAliveTimeout, or an idle connection can be closed while the next
// request on it is still being read.
httpServer.keepAliveTimeout = 30_000
httpServer.headersTimeout = 60_000
httpServer.requestTimeout = 2 * 60 * 60 * 1_000

httpServer.on('error', (error) => {
  // Listening itself failed (EADDRINUSE, EACCES). There is nothing in flight
  // to drain, and retrying would only hide a misconfigured deployment.
  logger.error('server_listen_failed', {
    category: 'internal',
    code: typeof error?.code === 'string' ? error.code : 'LISTEN_FAILED',
    component: 'server',
    stack: stackFrames(error),
    status: 500,
  })
  process.exit(1)
})

const sessionCleanup = createExpiredSessionCleanup()
sessionCleanup.start()

const shutdown = createGracefulShutdown({ database: prisma, httpServer })

function handleSignal(signal) {
  sessionCleanup.stop()
  shutdown(signal)
}

/**
 * Policy for an unhandled failure: the process is treated as unrecoverable.
 * Its state is unknown, so it stops accepting connections, drains what is
 * already in flight, releases the database pool and its temp files, and exits
 * non-zero for the supervisor to restart. A second fatal event during that
 * drain exits immediately rather than waiting again.
 *
 * Only the stack frames are recorded; the message is left out for the same
 * reason the error middleware leaves it out.
 */
function handleFatal(event, error) {
  logger.error(event, {
    category: 'internal',
    component: 'server',
    signal: event,
    stack: stackFrames(error),
    status: 500,
  })
  sessionCleanup.stop()
  if (!shutdown(event, { failed: true })) process.exit(1)
}

process.on('SIGTERM', () => handleSignal('SIGTERM'))
process.on('SIGINT', () => handleSignal('SIGINT'))
process.on('uncaughtException', (error) => {
  handleFatal('uncaught_exception', error)
})
process.on('unhandledRejection', (reason) => {
  // A rejection value is not always an Error; stackFrames returns nothing for
  // one without a stack, and nothing else about it is safe to log.
  handleFatal('unhandled_rejection', reason)
})
