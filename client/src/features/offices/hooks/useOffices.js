import { useCallback, useEffect, useState } from 'react'

import { fetchOffices } from '../api/office-api.js'

/**
 * Loads one page of the public office list.
 *
 * `status` mirrors the results page vocabulary — loading / empty / error /
 * ready — so the page can reuse the same state components.
 *
 * The loaded page is stamped with the request it answered. Anything else is
 * still in flight and reads as `loading` during render, which avoids resetting
 * state from inside the effect just to show the skeleton again.
 */
export function useOffices(page) {
  const [requestVersion, setRequestVersion] = useState(0)
  const [loaded, setLoaded] = useState(null)
  const requestKey = `${page}:${requestVersion}`

  useEffect(() => {
    const controller = new AbortController()

    fetchOffices({ page, signal: controller.signal })
      .then((response) => {
        setLoaded({
          error: null,
          key: requestKey,
          meta: response.meta,
          offices: response.data,
          status: response.meta.total === 0 ? 'empty' : 'ready',
        })
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setLoaded({
            error,
            key: requestKey,
            meta: null,
            offices: [],
            status: 'error',
          })
        }
      })

    return () => controller.abort()
  }, [page, requestKey])

  const retry = useCallback(() => {
    setRequestVersion((version) => version + 1)
  }, [])

  const current = loaded?.key === requestKey ? loaded : null

  return {
    error: current?.error ?? null,
    meta: current?.meta ?? null,
    offices: current?.offices ?? [],
    retry,
    status: current?.status ?? 'loading',
  }
}
