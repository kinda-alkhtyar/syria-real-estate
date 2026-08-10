/**
 * `shortLabelKey` feeds the compact phone dropdown, where the full sentence
 * labels would clip inside a native select.
 */
export const resultSortOptions = [
  {
    id: 'newest',
    labelKey: 'results.sortNewest',
    shortLabelKey: 'results.sortShort.newest',
  },
  {
    id: 'price-asc',
    labelKey: 'results.sortPriceAscending',
    shortLabelKey: 'results.sortShort.priceAscending',
  },
  {
    id: 'price-desc',
    labelKey: 'results.sortPriceDescending',
    shortLabelKey: 'results.sortShort.priceDescending',
  },
]

export const resultsPerPage = 2

export const defaultResultCriteria = {
  transactionType: '',
  governorate: '',
  propertyType: '',
  minPrice: '',
  maxPrice: '',
  bedrooms: '',
  bathrooms: '',
  minArea: '',
  maxArea: '',
  status: '',
  sort: 'newest',
  page: 1,
}
