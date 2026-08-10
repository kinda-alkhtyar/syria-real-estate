function similarityScore(property, candidate) {
  return (
    (candidate.transactionType === property.transactionType ? 4 : 0) +
    (candidate.governorate === property.governorate ? 2 : 0) +
    (candidate.propertyType === property.propertyType ? 1 : 0)
  )
}

export function selectSimilarProperties(catalog, property, limit = 3) {
  return catalog
    .filter((candidate) => candidate.id !== property.id)
    .map((candidate) => ({
      candidate,
      score: similarityScore(property, candidate),
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        (right.candidate.publishedAt ?? '').localeCompare(
          left.candidate.publishedAt ?? '',
        ) ||
        left.candidate.id.localeCompare(right.candidate.id),
    )
    .slice(0, limit)
    .map(({ candidate }) => candidate)
}
