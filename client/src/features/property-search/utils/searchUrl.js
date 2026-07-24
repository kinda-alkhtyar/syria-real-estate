/**
 * Search URL Utilities
 * Helpers for building and parsing search URLs
 */

/**
 * Build a search URL from parameters
 * @param {Object} params - Search parameters
 * @param {string} params.intent - 'buy' or 'rent'
 * @param {string} params.governorate - Governorate ID
 * @param {string} params.propertyType - Property type ID
 * @returns {string} URL query string
 */
export function buildSearchUrl(params) {
  const queryParams = new URLSearchParams()

  if (params.intent) queryParams.append('intent', params.intent)
  if (params.governorate) queryParams.append('gov', params.governorate)
  if (params.propertyType) queryParams.append('type', params.propertyType)

  const query = queryParams.toString()
  return query ? `/search?${query}` : '/search'
}

/**
 * Parse search parameters from URL
 * @param {string} queryString - URL query string
 * @returns {Object} Parsed search parameters
 */
export function parseSearchUrl(queryString) {
  const params = new URLSearchParams(queryString)

  return {
    intent: params.get('intent') || 'buy',
    governorate: params.get('gov') || '',
    propertyType: params.get('type') || '',
  }
}
