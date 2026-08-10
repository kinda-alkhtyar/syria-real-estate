import { useCallback, useEffect, useState } from 'react'

import { fetchManagementProperties } from '../api/management-property-api.js'

export function useManagementProperties() {
  const [page, setPage] = useState(1)
  const [requestVersion, setRequestVersion] = useState(0)
  const [state, setState] = useState({
    data: [],
    error: null,
    meta: null,
    status: 'loading',
  })

  useEffect(() => {
    const controller = new AbortController()

    fetchManagementProperties({ page, signal: controller.signal })
      .then((response) => {
        setState({
          data: response.data,
          error: null,
          meta: response.meta,
          status: response.data.length === 0 ? 'empty' : 'ready',
        })
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setState({
            data: [],
            error,
            meta: null,
            status: 'error',
          })
        }
      })

    return () => controller.abort()
  }, [page, requestVersion])

  const retry = useCallback(() => {
    setState((current) => ({
      ...current,
      error: null,
      status: 'loading',
    }))
    setRequestVersion((version) => version + 1)
  }, [])

  const goToPage = useCallback((nextPage) => {
    setState((current) => ({
      ...current,
      error: null,
      status: 'loading',
    }))
    setPage(nextPage)
  }, [])

  return {
    ...state,
    page,
    retry,
    setPage: goToPage,
  }
}
