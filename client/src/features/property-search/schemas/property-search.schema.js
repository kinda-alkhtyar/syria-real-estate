import { syrianGovernorates } from '../../../constants/syrian-governorates.js'
import { propertyTypes } from '../constants/property-types.js'
import {
  defaultSearchCriteria,
  transactionTypes,
} from '../constants/search-options.js'

const allowedValues = {
  transactionType: new Set(transactionTypes.map((option) => option.id)),
  governorate: new Set(syrianGovernorates.map((option) => option.id)),
  propertyType: new Set(propertyTypes.map((option) => option.id)),
}

/**
 * Normalizes untrusted URL values before they enter controlled form state.
 *
 * @param {Partial<typeof defaultSearchCriteria>} values
 * @returns {typeof defaultSearchCriteria}
 */
export function parsePropertySearchCriteria(values) {
  return {
    transactionType: allowedValues.transactionType.has(values.transactionType)
      ? values.transactionType
      : defaultSearchCriteria.transactionType,
    governorate: allowedValues.governorate.has(values.governorate)
      ? values.governorate
      : defaultSearchCriteria.governorate,
    propertyType: allowedValues.propertyType.has(values.propertyType)
      ? values.propertyType
      : defaultSearchCriteria.propertyType,
  }
}
