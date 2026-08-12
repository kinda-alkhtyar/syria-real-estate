import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '../../auth/hooks/useAuth.js'
import { fetchMyProfile } from '../api/account-api.js'

/**
 * The signed-in account's own profile.
 *
 * Statuses: `loading` until the first answer arrives, then `ready` or `error`.
 * The request is never made for a visitor — the page behind this hook is
 * guarded, and a redirect should not cost a rejected call on the way out.
 *
 * `replace` lets the edit dialog hand back the profile the API just returned,
 * so a save costs one request rather than two.
 */
export function useMyProfile() {
  const { status: authStatus, user } = useAuth()
  const isAuthenticated = authStatus === 'authenticated'
  const [requestVersion, setRequestVersion] = useState(0)
  const [loaded, setLoaded] = useState(null)
  const requestKey = `${user?.id ?? ''}:${requestVersion}`

  useEffect(() => {
    if (!isAuthenticated) return undefined
    const controller = new AbortController()

    fetchMyProfile({ signal: controller.signal })
      .then((profile) => setLoaded({ key: requestKey, profile, status: 'ready' }))
      .catch((error) => {
        if (error.name === 'AbortError') return
        setLoaded({ key: requestKey, profile: null, status: 'error' })
      })

    return () => controller.abort()
  }, [isAuthenticated, requestKey])

  const retry = useCallback(() => {
    setLoaded(null)
    setRequestVersion((version) => version + 1)
  }, [])

  const replace = useCallback(
    (profile) => setLoaded({ key: requestKey, profile, status: 'ready' }),
    [requestKey],
  )

  const current = loaded?.key === requestKey ? loaded : null

  return {
    profile: current?.profile ?? null,
    replace,
    retry,
    status: current?.status ?? 'loading',
  }
}
