import { useCallback, useEffect, useState } from 'react'

import { ApiError } from '../../../api/api-client.js'
import { useAuth } from '../../auth/hooks/useAuth.js'
import { fetchMyOffice } from '../api/office-api.js'

const officeManagers = ['ADMIN', 'OWNER']

/**
 * The signed-in owner's own office, if there is one.
 *
 * Statuses: `hidden` for anyone who cannot own an office, `none` when the API
 * answers 404 — the normal state before the first office is created — and
 * `ready` / `error` otherwise. The request is never made for a visitor, so a
 * public page costs no extra call.
 */
export function useMyOffice() {
  const { status: authStatus, user } = useAuth()
  const canOwnOffice =
    authStatus === 'authenticated' && officeManagers.includes(user?.role)
  const [requestVersion, setRequestVersion] = useState(0)
  const [loaded, setLoaded] = useState(null)
  const requestKey = `${user?.id ?? ''}:${requestVersion}`

  useEffect(() => {
    if (!canOwnOffice) return undefined
    const controller = new AbortController()

    fetchMyOffice({ signal: controller.signal })
      .then((office) => {
        setLoaded({ key: requestKey, office, status: 'ready' })
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setLoaded({
          key: requestKey,
          office: null,
          status:
            error instanceof ApiError && error.status === 404
              ? 'none'
              : 'error',
        })
      })

    return () => controller.abort()
  }, [canOwnOffice, requestKey])

  const refresh = useCallback(() => {
    setRequestVersion((version) => version + 1)
  }, [])

  if (!canOwnOffice) {
    return { office: null, refresh, status: 'hidden' }
  }

  const current = loaded?.key === requestKey ? loaded : null

  return {
    office: current?.office ?? null,
    refresh,
    status: current?.status ?? 'loading',
  }
}
