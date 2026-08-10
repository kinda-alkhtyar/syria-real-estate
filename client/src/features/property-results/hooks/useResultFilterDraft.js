import { useCallback, useMemo, useState } from 'react'

import { parsePropertyResultCriteria } from '../schemas/property-results.schema.js'

const filterKeys = [
  'transactionType',
  'propertyType',
  'governorate',
  'minPrice',
  'maxPrice',
  'bedrooms',
  'bathrooms',
  'minArea',
  'maxArea',
  'status',
]

function pickFilters(criteria) {
  return Object.fromEntries(filterKeys.map((key) => [key, criteria[key]]))
}

/**
 * Keeps filter edits local until the user explicitly applies them.
 */
export function useResultFilterDraft(criteria, onApply) {
  const appliedFilters = useMemo(() => pickFilters(criteria), [criteria])
  const appliedKey = JSON.stringify(appliedFilters)
  const [draftState, setDraftState] = useState(() => ({
    appliedKey,
    values: appliedFilters,
  }))
  const draft =
    draftState.appliedKey === appliedKey
      ? draftState.values
      : appliedFilters

  const updateDraft = useCallback((changes) => {
    setDraftState((current) => ({
      appliedKey,
      values: {
        ...(current.appliedKey === appliedKey
          ? current.values
          : appliedFilters),
        ...changes,
      },
    }))
  }, [appliedFilters, appliedKey])

  const applyDraft = useCallback(() => {
    const parsed = parsePropertyResultCriteria(draft)
    const filters = pickFilters(parsed)
    setDraftState({ appliedKey, values: filters })
    onApply(filters)
  }, [appliedKey, draft, onApply])

  const clearDraft = useCallback(() => {
    const empty = pickFilters(parsePropertyResultCriteria({}))
    setDraftState({ appliedKey, values: empty })
    onApply(empty)
  }, [appliedKey, onApply])

  return { applyDraft, clearDraft, draft, updateDraft }
}
