import logger from '../observability/logger.js'
import { deleteExpiredSessions } from '../repositories/auth-session.repository.js'

const defaultIntervalMs = 60 * 60 * 1000

/**
 * Periodically removes AuthSession rows whose expiresAt has passed.
 *
 * The timer is unref'd so it never keeps the process alive, and a run is
 * skipped while the previous one is still in flight. The delete is idempotent,
 * so running this on every instance of a horizontally scaled deployment is
 * safe — it only repeats work that has already been done.
 */
export function createExpiredSessionCleanup({
  clearTimer = clearInterval,
  deleteExpired = deleteExpiredSessions,
  intervalMs = defaultIntervalMs,
  log = logger,
  setTimer = setInterval,
} = {}) {
  let timer = null
  let inFlight = false

  async function runOnce() {
    if (inFlight) return 0
    inFlight = true
    try {
      const removed = await deleteExpired()
      if (removed > 0) {
        log.info('expired_sessions_removed', {
          component: 'auth',
          status: 200,
        })
      }
      return removed
    } catch {
      // Cleanup is best effort: a failed sweep must never crash the process.
      log.error('expired_session_cleanup_failed', {
        category: 'database',
        component: 'auth',
        status: 500,
      })
      return 0
    } finally {
      inFlight = false
    }
  }

  return {
    runOnce,

    start() {
      if (timer) return false
      timer = setTimer(runOnce, intervalMs)
      timer.unref?.()
      void runOnce()
      return true
    },

    stop() {
      if (!timer) return false
      clearTimer(timer)
      timer = null
      return true
    },
  }
}
