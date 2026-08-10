import { useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useProperties } from '../../properties/hooks/useProperties.js'
import {
  defaultResultCriteria,
  resultsPerPage,
} from '../constants/result-options.js'
import { parseResultQuery, updateResultQuery } from '../utils/result-query.js'
import { selectPropertyResults } from '../utils/select-results.js'

/**
 * Owns URL-synchronized result criteria and deterministic catalog selection.
 */
export function usePropertyResults() {
  const { properties, retry, status } = useProperties()
  const [searchParams, setSearchParams] = useSearchParams()
  const criteria = useMemo(() => parseResultQuery(searchParams), [searchParams])
  const results = useMemo(
    () => selectPropertyResults(properties, criteria, resultsPerPage),
    [criteria, properties],
  )

  useEffect(() => {
    if (results.page !== criteria.page) {
      setSearchParams(
        (current) => updateResultQuery(current, { page: results.page }),
        { replace: true },
      )
    }
  }, [criteria.page, results.page, setSearchParams])

  useEffect(() => {
    const hasContextlessPriceSort =
      !criteria.transactionType &&
      (criteria.sort === 'price-asc' || criteria.sort === 'price-desc')

    if (hasContextlessPriceSort) {
      setSearchParams(
        (current) =>
          updateResultQuery(current, {
            sort: defaultResultCriteria.sort,
          }),
        { replace: true },
      )
    }
  }, [criteria.sort, criteria.transactionType, setSearchParams])

  const updateCriteria = useCallback(
    (changes) => {
      setSearchParams((current) =>
        updateResultQuery(current, { ...changes, page: 1 }),
      )
    },
    [setSearchParams],
  )

  const setPage = useCallback(
    (page) => {
      setSearchParams((current) => updateResultQuery(current, { page }))
    },
    [setSearchParams],
  )

  const clearCriteria = useCallback(() => {
    setSearchParams((current) =>
      updateResultQuery(current, defaultResultCriteria),
    )
  }, [setSearchParams])

  return {
    catalogIsEmpty: status === 'empty',
    clearCriteria,
    criteria,
    results,
    retry,
    status,
    setPage,
    updateCriteria,
  }
}
