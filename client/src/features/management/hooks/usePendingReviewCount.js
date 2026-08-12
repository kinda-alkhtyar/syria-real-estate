import { useCallback, useEffect, useState } from 'react'

import { fetchPendingReviewCount } from '../api/management-property-api.js'

/**
 * The review badge. Only administrators moderate, so the request is not even
 * sent for anybody else, and a failure is swallowed on purpose: a badge that
 * cannot be counted simply does not appear, rather than turning the dashboard
 * shell into an error surface.
 */
export function usePendingReviewCount({ enabled = true } = {}) {
  const [count, setCount] = useState(0)
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    if (!enabled) return undefined

    const controller = new AbortController()
    fetchPendingReviewCount({ signal: controller.signal })
      .then(setCount)
      .catch(() => {})

    return () => controller.abort()
  }, [enabled, requestVersion])

  const refresh = useCallback(() => {
    setRequestVersion((version) => version + 1)
  }, [])

  // Reported as zero rather than reset in an effect: a role that may not
  // moderate has no queue to speak of, whatever was counted before.
  return { count: enabled ? count : 0, refresh }
}
