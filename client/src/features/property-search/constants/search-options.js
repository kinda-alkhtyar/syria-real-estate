/**
 * Stable transaction identifiers used by the UI, URL, and future API boundary.
 */
export const transactionTypes = [
  { id: 'buy', labelKey: 'transactionTypes.buy' },
  { id: 'rent', labelKey: 'transactionTypes.rent' },
  { id: 'stays', labelKey: 'transactionTypes.stays' },
]

export const defaultSearchCriteria = {
  transactionType: 'buy',
  governorate: '',
  propertyType: '',
}
