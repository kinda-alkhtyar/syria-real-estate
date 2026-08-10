const searchKeys = ['transactionType', 'governorate', 'propertyType']

/**
 * Reads known search keys without treating URL input as validated data.
 *
 * @param {URLSearchParams} searchParams
 * @returns {Record<(typeof searchKeys)[number], string>}
 */
export function readSearchParams(searchParams) {
  return Object.fromEntries(
    searchKeys.map((key) => [key, searchParams.get(key) ?? '']),
  )
}

/**
 * Serializes criteria while retaining URL state owned by other features.
 *
 * @param {Record<(typeof searchKeys)[number], string>} criteria
 * @param {URLSearchParams} [currentSearchParams]
 * @returns {URLSearchParams}
 */
export function createSearchParams(
  criteria,
  currentSearchParams = new URLSearchParams(),
) {
  const searchParams = new URLSearchParams(currentSearchParams)

  searchKeys.forEach((key) => {
    if (criteria[key]) {
      searchParams.set(key, criteria[key])
    } else {
      searchParams.delete(key)
    }
  })

  return searchParams
}
