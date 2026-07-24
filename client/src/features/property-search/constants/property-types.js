/**
 * Property Types
 * Standard property classification for search and filtering
 */

export const propertyTypes = [
  { id: 'apartment', key: 'apartment' },
  { id: 'house', key: 'house' },
  { id: 'land', key: 'land' },
  { id: 'commercial', key: 'commercial' },
  { id: 'studio', key: 'studio' },
  { id: 'villa', key: 'villa' },
  { id: 'townhouse', key: 'townhouse' },
]

export const getPropertyTypeLabel = (typeId) => {
  // Keys map to translation file paths like propertyTypes.apartment
  const key = propertyTypes.find((t) => t.id === typeId)?.key
  return key ? `propertyTypes.${key}` : ''
}
