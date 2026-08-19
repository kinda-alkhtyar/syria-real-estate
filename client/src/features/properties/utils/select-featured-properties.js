import { featuredPropertyIds } from '../catalog/property-catalog.js'

function byNewestFirst(source) {
  return [...source].sort(
    (first, second) =>
      new Date(second.publishedAt ?? 0) - new Date(first.publishedAt ?? 0),
  )
}

/**
 * The listings a homepage rail should showcase, newest first.
 *
 * `featured` is the API flag and wins whenever any listing carries it. The
 * curated catalogue ids stand in for the bundled sample data, which predates
 * the flag, and the newest listings stand in last so the rail is never empty.
 */
export function selectFeaturedProperties(source, limit) {
  const newest = byNewestFirst(source)
  const flagged = newest.filter((listing) => listing.featured)
  if (flagged.length > 0) return flagged.slice(0, limit)

  const curated = newest.filter((listing) =>
    featuredPropertyIds.includes(listing.id),
  )
  if (curated.length > 0) return curated.slice(0, limit)

  return newest.slice(0, limit)
}
