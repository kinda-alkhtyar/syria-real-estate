import { useCallback, useEffect, useState } from 'react'

import { ApiError } from '../../../api/api-client.js'
import { fetchOffice } from '../api/office-api.js'

/**
 * Loads one office together with the requested page of its published listings.
 *
 * A 404 is reported as its own `notFound` status: it is an expected answer for
 * a stale link, not a failure the visitor should be asked to retry.
 *
 * As in `useOffices`, the answer carries the request key it belongs to so a
 * pending page reads as `loading` without an effect writing state up front.
 */
export function useOfficeDetails(officeId, page) {
  const [requestVersion, setRequestVersion] = useState(0)
  const [loaded, setLoaded] = useState(null)
  const requestKey = `${officeId}:${page}:${requestVersion}`

  useEffect(() => {
    const controller = new AbortController()

    fetchOffice(officeId, { page, signal: controller.signal })
      .then((response) => {
        setLoaded({
          error: null,
          key: requestKey,
          office: response.data,
          properties: response.properties,
          status: 'ready',
        })
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setLoaded({
          error,
          key: requestKey,
          office: null,
          properties: null,
          status:
            error instanceof ApiError && error.status === 404
              ? 'notFound'
              : 'error',
        })
      })

    return () => controller.abort()
  }, [officeId, page, requestKey])

  const retry = useCallback(() => {
    setRequestVersion((version) => version + 1)
  }, [])

  const current = loaded?.key === requestKey ? loaded : null

  return {
    error: current?.error ?? null,
    office: current?.office ?? null,
    properties: current?.properties ?? null,
    retry,
    status: current?.status ?? 'loading',
  }
}
