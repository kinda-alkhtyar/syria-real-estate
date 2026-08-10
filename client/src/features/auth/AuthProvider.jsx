import { useCallback, useEffect, useMemo, useState } from 'react'

import { ApiError } from '../../api/api-client.js'
import {
  getCurrentUser,
  login as requestLogin,
  loginWithGoogle as requestGoogleLogin,
  logout as requestLogout,
} from './api/auth-client.js'
import { AuthContext } from './context/auth-context.js'

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading')
  const [user, setUser] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    getCurrentUser({ signal: controller.signal })
      .then((currentUser) => {
        setUser(currentUser)
        setStatus('authenticated')
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setUser(null)
        setStatus(
          error instanceof ApiError && error.status === 401
            ? 'unauthenticated'
            : 'error',
        )
      })

    return () => controller.abort()
  }, [])

  const login = useCallback(async (credentials) => {
    setStatus('loading')
    try {
      await requestLogin(credentials)
      const currentUser = await getCurrentUser()
      setUser(currentUser)
      setStatus('authenticated')
      return currentUser
    } catch (error) {
      setUser(null)
      setStatus('unauthenticated')
      throw error
    }
  }, [])

  const loginWithGoogle = useCallback(async (credential) => {
    setStatus('loading')
    try {
      await requestGoogleLogin(credential)
      const currentUser = await getCurrentUser()
      setUser(currentUser)
      setStatus('authenticated')
      return currentUser
    } catch (error) {
      setUser(null)
      setStatus('unauthenticated')
      throw error
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await requestLogout()
    } catch {
      // Remove protected client state even if the server cannot be reached.
    } finally {
      setUser(null)
      setStatus('unauthenticated')
    }
  }, [])

  const value = useMemo(
    () => ({
      isAuthenticated: status === 'authenticated',
      login,
      loginWithGoogle,
      logout,
      status,
      user,
    }),
    [login, loginWithGoogle, logout, status, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
