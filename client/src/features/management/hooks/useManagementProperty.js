import { useCallback, useEffect, useState } from 'react'

import { fetchManagementProperty } from '../api/management-property-api.js'

export function useManagementProperty(propertyId) {
  const [requestVersion, setRequestVersion] = useState(0)
  const [state, setState] = useState({
    error: null,
    property: null,
    status: 'loading',
  })

  useEffect(() => {
    const controller = new AbortController()

    fetchManagementProperty(propertyId, { signal: controller.signal })
      .then((property) => {
        setState({ error: null, property, status: 'ready' })
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setState({ error, property: null, status: 'error' })
        }
      })

    return () => controller.abort()
  }, [propertyId, requestVersion])

  const retry = useCallback(() => {
    setState({ error: null, property: null, status: 'loading' })
    setRequestVersion((version) => version + 1)
  }, [])

  return { ...state, retry }
}
