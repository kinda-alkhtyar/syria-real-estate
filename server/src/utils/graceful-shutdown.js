import { removeTemporaryUploadDirectory } from '../middleware/property-video-upload.middleware.js'
import applicationLifecycle from '../observability/lifecycle.js'
import logger from '../observability/logger.js'

export function createGracefulShutdown({
  cleanup = removeTemporaryUploadDirectory,
  clearTimer = clearTimeout,
  database,
  exit = process.exit,
  httpServer,
  lifecycle = applicationLifecycle,
  log = logger,
  setTimer = setTimeout,
  timeoutMs = 10_000,
} = {}) {
  let started = false

  /**
   * `failed` marks a shutdown that a fatal error started rather than a signal:
   * the drain still runs, but the exit code stays non-zero even if it is clean.
   */
  return function shutdown(signal, { failed = false } = {}) {
    if (started) return false
    started = true
    lifecycle.markShuttingDown()
    log.info('shutdown_started', { component: 'server', signal })

    const forcedTimer = setTimer(() => {
      httpServer.closeAllConnections?.()
      log.error('shutdown_forced', { component: 'server', signal })
      exit(1)
    }, timeoutMs)
    forcedTimer.unref?.()

    httpServer.close(async (serverError) => {
      let disconnectError = null
      try {
        await database.$disconnect()
      } catch (error) {
        disconnectError = error
      }

      // After the drain, never before it: an upload still finishing during
      // those seconds keeps the temp file it is writing to.
      try {
        await cleanup()
      } catch {
        // Best effort; a leftover directory must not change the exit code.
      }

      clearTimer(forcedTimer)
      if (failed || serverError || disconnectError) {
        log.error('shutdown_failed', { component: 'server', signal })
        exit(1)
        return
      }

      log.info('shutdown_completed', { component: 'server', signal })
      exit(0)
    })

    // `close` alone waits for every keep-alive socket to go idle on its own,
    // which normally means burning the whole timeout above before the drain
    // finishes. Idle sockets carry no request, so ending them costs nothing.
    httpServer.closeIdleConnections?.()

    return true
  }
}
