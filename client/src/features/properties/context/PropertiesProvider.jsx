import { useCallback, useEffect, useMemo, useState } from 'react'

import { useLocale } from '../../../hooks/useLocale.js'
import { fromPropertyApi } from '../adapters/from-property-api.js'
import { fetchPropertyCatalog } from '../api/property-api.js'
import { PropertiesContext } from './properties-context.js'

export function PropertiesProvider({ children }) {
  const { locale } = useLocale()
  const [requestVersion, setRequestVersion] = useState(0)
  const [state, setState] = useState({
    records: [],
    status: 'loading',
  })

  useEffect(() => {
    const controller = new AbortController()

    fetchPropertyCatalog({ signal: controller.signal })
      .then((records) => {
        setState({
          records,
          status: records.length === 0 ? 'empty' : 'ready',
        })
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setState({ records: [], status: 'error' })
        }
      })

    return () => controller.abort()
  }, [requestVersion])

  const retry = useCallback(() => {
    setState((current) => ({ ...current, status: 'loading' }))
    setRequestVersion((version) => version + 1)
  }, [])
  const properties = useMemo(
    () =>
      state.records.map((property) =>
        fromPropertyApi(property, locale.code),
      ),
    [locale.code, state.records],
  )
  const value = useMemo(
    () => ({ properties, retry, status: state.status }),
    [properties, retry, state.status],
  )

  return (
    <PropertiesContext.Provider value={value}>
      {children}
    </PropertiesContext.Provider>
  )
}
