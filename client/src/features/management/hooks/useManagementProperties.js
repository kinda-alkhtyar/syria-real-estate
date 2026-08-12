import { useCallback, useEffect, useState } from 'react'

import { fetchManagementProperties } from '../api/management-property-api.js'

/**
 * `status` narrows the list to one listing state — the review queue passes
 * PENDING_REVIEW. It is a plain string, so a caller may inline the options
 * object without memoising it.
 */
export function useManagementProperties({ status = '' } = {}) {
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

    fetchManagementProperties({ page, signal: controller.signal, status })
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
  }, [page, requestVersion, status])

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
