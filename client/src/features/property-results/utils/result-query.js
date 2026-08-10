import { defaultResultCriteria } from '../constants/result-options.js'
import { parsePropertyResultCriteria } from '../schemas/property-results.schema.js'

const resultKeys = Object.keys(defaultResultCriteria)
const resultFilterKeys = resultKeys.filter(
  (key) => key !== 'page' && key !== 'sort',
)

/**
 * Counts applied filters without treating sort or pagination as filters.
 */
export function countActiveResultFilters(criteria) {
  return resultFilterKeys.reduce(
    (count, key) =>
      criteria[key] !== '' &&
      criteria[key] !== undefined &&
      criteria[key] !== null
        ? count + 1
        : count,
    0,
  )
}

/**
 * Parses and validates results parameters from the public URL.
 */
export function parseResultQuery(searchParams) {
  return parsePropertyResultCriteria(
    Object.fromEntries(
      resultKeys.map((key) => [key, searchParams.get(key) ?? '']),
    ),
  )
}

/**
 * Produces a URLSearchParams update without discarding unrelated parameters.
 */
export function updateResultQuery(currentParams, changes) {
  const nextParams = new URLSearchParams(currentParams)

  Object.entries(changes).forEach(([key, value]) => {
    if (
      value === '' ||
      value === undefined ||
      value === null ||
      (key === 'page' && value === 1) ||
      (key === 'sort' && value === defaultResultCriteria.sort)
    ) {
      nextParams.delete(key)
    } else {
      nextParams.set(key, String(value))
    }
  })

  return nextParams
}
