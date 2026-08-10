/**
 * Filters, sorts, and paginates a catalog without mutating source data.
 */
export function selectPropertyResults(catalog, criteria, pageSize) {
  const filtered = catalog.filter(
    (listing) =>
      (!criteria.transactionType ||
        listing.transactionType === criteria.transactionType) &&
      (!criteria.governorate ||
        listing.governorate === criteria.governorate) &&
      (!criteria.propertyType ||
        listing.propertyType === criteria.propertyType) &&
      (!criteria.status || listing.status === criteria.status) &&
      (criteria.minPrice === '' ||
        listing.price.amount >= criteria.minPrice) &&
      (criteria.maxPrice === '' ||
        listing.price.amount <= criteria.maxPrice) &&
      (criteria.bedrooms === '' ||
        (listing.facts.bedrooms !== undefined &&
          listing.facts.bedrooms >= criteria.bedrooms)) &&
      (criteria.bathrooms === '' ||
        (listing.facts.bathrooms !== undefined &&
          listing.facts.bathrooms >= criteria.bathrooms)) &&
      (criteria.minArea === '' ||
        (listing.facts.areaSquareMeters !== undefined &&
          listing.facts.areaSquareMeters >= criteria.minArea)) &&
      (criteria.maxArea === '' ||
        (listing.facts.areaSquareMeters !== undefined &&
          listing.facts.areaSquareMeters <= criteria.maxArea)),
  )

  const priceBases = new Set(
    filtered.map(
      (listing) =>
        `${listing.transactionType}:${listing.price.currency}:${listing.price.periodKey ?? 'total'}`,
    ),
  )
  const canSortByPrice =
    Boolean(criteria.transactionType) && priceBases.size <= 1

  const sorted = [...filtered].sort((left, right) => {
    if (canSortByPrice && criteria.sort === 'price-asc') {
      return left.price.amount - right.price.amount
    }
    if (canSortByPrice && criteria.sort === 'price-desc') {
      return right.price.amount - left.price.amount
    }
    return right.publishedAt.localeCompare(left.publishedAt)
  })

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const page = Math.min(criteria.page, pageCount)
  const start = (page - 1) * pageSize

  return {
    items: sorted.slice(start, start + pageSize),
    page,
    pageCount,
    total: sorted.length,
    hasPartialData: sorted.some(
      (listing) =>
        listing.facts.bedrooms === undefined ||
        listing.facts.bathrooms === undefined ||
        listing.facts.areaSquareMeters === undefined,
    ),
  }
}
