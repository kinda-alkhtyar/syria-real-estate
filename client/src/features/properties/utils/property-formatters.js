/**
 * Formats a monetary amount for the active locale and listing currency.
 *
 * @param {number} amount
 * @param {string} currency
 * @param {string} localeCode
 * @returns {string}
 */
export function formatCurrency(amount, currency, localeCode) {
  return new Intl.NumberFormat(localeCode, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Formats a numeric property fact using locale-appropriate digits and grouping.
 *
 * @param {number} value
 * @param {string} localeCode
 * @returns {string}
 */
export function formatNumber(value, localeCode) {
  return new Intl.NumberFormat(localeCode).format(value)
}

/**
 * Formats square metres while allowing the translation layer to own unit order.
 *
 * @param {number} value
 * @param {string} localeCode
 * @param {(key: string, variables?: object) => string} t
 * @returns {string}
 */
export function formatArea(value, localeCode, t) {
  return t('propertyFacts.areaValue', {
    value: formatNumber(value, localeCode),
  })
}
