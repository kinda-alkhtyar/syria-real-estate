import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { parsePropertySearchCriteria } from '../schemas/property-search.schema.js'
import {
  createSearchParams,
  readSearchParams,
} from '../utils/searchUrl.js'

/**
 * Keeps edits local while making submitted search criteria shareable by URL.
 *
 * @returns {{
 *   criteria: {transactionType: string, governorate: string, propertyType: string},
 *   submitSearch: (event: React.FormEvent<HTMLFormElement>) => void,
 *   updateCriterion: (name: string, value: string) => void
 * }}
 */
export function usePropertySearch() {
  const navigate = useNavigate()
  const [urlSearchParams] = useSearchParams()
  const [criteria, setCriteria] = useState(() =>
    parsePropertySearchCriteria(readSearchParams(urlSearchParams)),
  )

  useEffect(() => {
    function syncCriteriaFromHistory() {
      const currentSearchParams = new URLSearchParams(window.location.search)
      setCriteria(
        parsePropertySearchCriteria(readSearchParams(currentSearchParams)),
      )
    }

    window.addEventListener('popstate', syncCriteriaFromHistory)
    return () => window.removeEventListener('popstate', syncCriteriaFromHistory)
  }, [])

  const updateCriterion = useCallback((name, value) => {
    setCriteria((currentCriteria) => ({
      ...currentCriteria,
      [name]: value,
    }))
  }, [])

  const submitSearch = useCallback(
    (event) => {
      event.preventDefault()
      const normalizedCriteria = parsePropertySearchCriteria(criteria)
      setCriteria(normalizedCriteria)
      const nextSearchParams = createSearchParams(
        normalizedCriteria,
        urlSearchParams,
      )
      navigate(`/properties?${nextSearchParams.toString()}`)
    },
    [criteria, navigate, urlSearchParams],
  )

  return {
    criteria,
    submitSearch,
    updateCriterion,
  }
}
