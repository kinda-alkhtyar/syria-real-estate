import { featuredPropertyIds } from '../catalog/property-catalog.js'

export const featuredLimit = 4

function byNewestFirst(source) {
  return [...source].sort(
    (first, second) =>
      new Date(second.publishedAt ?? 0) - new Date(first.publishedAt ?? 0),
  )
}

/**
 * The listings promoted on the homepage: the flagged ones, then whatever was
 * published most recently.
 *
 * `featured` is the API flag. It decides the order rather than the whole rail,
 * so a freshly published listing is seen while only a couple of listings carry
 * the flag. The curated catalogue ids stand in as the flag for the bundled
 * sample data, which predates it.
 *
 * `publishedAt` is the adapter's name for the API's `createdAt`, so the filler
 * is newest-first in the sense the API means.
 */
export function selectFeaturedProperties(source, limit = featuredLimit) {
  const newest = byNewestFirst(source)
  const flagged = newest.filter((listing) => listing.featured)
  const promoted =
    flagged.length > 0
      ? flagged
      : newest.filter((listing) => featuredPropertyIds.includes(listing.id))
  const promotedIds = new Set(promoted.map((listing) => listing.id))

  return [
    ...promoted,
    ...newest.filter((listing) => !promotedIds.has(listing.id)),
  ].slice(0, limit)
}
