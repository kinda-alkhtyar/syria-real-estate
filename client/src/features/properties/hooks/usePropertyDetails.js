import { useCallback, useEffect, useState } from 'react'

import { ApiError } from '../../../api/api-client.js'
import { useLocale } from '../../../hooks/useLocale.js'
import { fromPropertyApi } from '../adapters/from-property-api.js'
import { fetchPropertyBySlug } from '../api/property-api.js'

export function usePropertyDetails(slug) {
  const { locale } = useLocale()
  const [requestVersion, setRequestVersion] = useState(0)
  const [state, setState] = useState({
    requestKey: null,
    property: null,
    status: 'loading',
  })
  const requestKey = `${slug}:${locale.code}:${requestVersion}`

  useEffect(() => {
    const controller = new AbortController()

    fetchPropertyBySlug(slug, { signal: controller.signal })
      .then((property) => {
        setState({
          requestKey,
          property: fromPropertyApi(property, locale.code),
          status: 'ready',
        })
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setState({
            requestKey,
            property: null,
            status:
              error instanceof ApiError && error.status === 404
                ? 'notFound'
                : 'error',
          })
        }
      })

    return () => controller.abort()
  }, [locale.code, requestKey, slug])

  const retry = useCallback(() => {
    setRequestVersion((version) => version + 1)
  }, [])

  if (state.requestKey !== requestKey) {
    return { property: null, retry, status: 'loading' }
  }

  return { property: state.property, retry, status: state.status }
}
