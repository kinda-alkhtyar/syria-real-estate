export const listingStatuses = [
  { id: 'available', labelKey: 'listingStatuses.available' },
  { id: 'reserved', labelKey: 'listingStatuses.reserved' },
]

export const numericFilterConstraints = {
  price: { min: 0, step: 100 },
  bedrooms: { min: 0, step: 1 },
  bathrooms: { min: 0, step: 1 },
  area: { min: 1, step: 1 },
}
