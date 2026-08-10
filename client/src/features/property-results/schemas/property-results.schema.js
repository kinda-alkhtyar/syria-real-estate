import { syrianGovernorates } from '../../../constants/syrian-governorates.js'
import { propertyTypes } from '../../property-search/constants/property-types.js'
import { transactionTypes } from '../../property-search/constants/search-options.js'
import { listingStatuses } from '../constants/filter-options.js'
import {
  defaultResultCriteria,
  resultSortOptions,
} from '../constants/result-options.js'

const allowedValues = {
  transactionType: new Set(transactionTypes.map(({ id }) => id)),
  propertyType: new Set(propertyTypes.map(({ id }) => id)),
  governorate: new Set(syrianGovernorates.map(({ id }) => id)),
  status: new Set(listingStatuses.map(({ id }) => id)),
  sort: new Set(resultSortOptions.map(({ id }) => id)),
}

const numericKeys = [
  'minPrice',
  'maxPrice',
  'bedrooms',
  'bathrooms',
  'minArea',
  'maxArea',
]

function parseOptionalNumber(value, minimum = 0) {
  if (value === '' || value === undefined || value === null) return ''
  const number = Number(value)
  return Number.isFinite(number) && number >= minimum
    ? Math.floor(number)
    : ''
}

/**
 * Validates untrusted result criteria from URLs or filter drafts.
 */
export function parsePropertyResultCriteria(values) {
  const parsed = {
    transactionType: allowedValues.transactionType.has(values.transactionType)
      ? values.transactionType
      : '',
    propertyType: allowedValues.propertyType.has(values.propertyType)
      ? values.propertyType
      : '',
    governorate: allowedValues.governorate.has(values.governorate)
      ? values.governorate
      : '',
    status: allowedValues.status.has(values.status) ? values.status : '',
    sort: allowedValues.sort.has(values.sort)
      ? values.sort
      : defaultResultCriteria.sort,
    page:
      Number.isSafeInteger(Number(values.page)) && Number(values.page) > 0
        ? Number(values.page)
        : 1,
  }

  numericKeys.forEach((key) => {
    parsed[key] = parseOptionalNumber(
      values[key],
      key === 'minArea' || key === 'maxArea' ? 1 : 0,
    )
  })

  if (
    parsed.minPrice !== '' &&
    parsed.maxPrice !== '' &&
    parsed.minPrice > parsed.maxPrice
  ) {
    parsed.maxPrice = ''
  }

  if (
    parsed.minArea !== '' &&
    parsed.maxArea !== '' &&
    parsed.minArea > parsed.maxArea
  ) {
    parsed.maxArea = ''
  }

  return parsed
}
