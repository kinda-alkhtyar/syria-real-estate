export const favoritesStorageKey = 'dar-syria:favorites:v1'

export function normalizeFavoriteIds(value, validIds) {
  if (!Array.isArray(value)) return []

  return [...new Set(value)].filter(
    (id) =>
      typeof id === 'string' && (!validIds || validIds.has(id)),
  )
}

export function readFavoriteIds(storage, validIds) {
  try {
    const storedValue = storage.getItem(favoritesStorageKey)
    if (!storedValue) return []
    return normalizeFavoriteIds(JSON.parse(storedValue), validIds)
  } catch {
    return []
  }
}

export function writeFavoriteIds(storage, favoriteIds) {
  try {
    storage.setItem(favoritesStorageKey, JSON.stringify(favoriteIds))
  } catch {
    // Favorites remain available for the current session when storage is blocked.
  }
}
