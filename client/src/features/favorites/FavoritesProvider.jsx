import { useCallback, useEffect, useMemo, useState } from 'react'

import { useProperties } from '../properties/hooks/useProperties.js'
import { FavoritesContext } from './favorites-context.js'
import {
  favoritesStorageKey,
  readFavoriteIds,
  writeFavoriteIds,
} from './favorites-storage.js'

function getInitialFavoriteIds() {
  return readFavoriteIds(window.localStorage)
}

export function FavoritesProvider({ children }) {
  const { properties, status } = useProperties()
  const currentPropertyIds = useMemo(
    () => new Set(properties.map((property) => property.id)),
    [properties],
  )
  const [favoriteIds, setFavoriteIds] = useState(getInitialFavoriteIds)
  const visibleFavoriteIds = useMemo(
    () =>
      status === 'ready' || status === 'empty'
        ? favoriteIds.filter((id) => currentPropertyIds.has(id))
        : favoriteIds,
    [currentPropertyIds, favoriteIds, status],
  )
  const favoriteIdSet = useMemo(
    () => new Set(visibleFavoriteIds),
    [visibleFavoriteIds],
  )

  const commitFavoriteIds = useCallback((createNextIds) => {
    setFavoriteIds((currentIds) => {
      const nextIds = createNextIds(currentIds)
      if (nextIds === currentIds) return currentIds
      writeFavoriteIds(window.localStorage, nextIds)
      return nextIds
    })
  }, [])

  const isFavorite = useCallback(
    (propertyId) => favoriteIdSet.has(propertyId),
    [favoriteIdSet],
  )

  const toggleFavorite = useCallback(
    (propertyId) => {
      if (!currentPropertyIds.has(propertyId)) return

      commitFavoriteIds((currentIds) =>
        currentIds.includes(propertyId)
          ? currentIds.filter((id) => id !== propertyId)
          : [...currentIds, propertyId],
      )
    },
    [commitFavoriteIds, currentPropertyIds],
  )

  const removeFavorite = useCallback(
    (propertyId) => {
      commitFavoriteIds((currentIds) =>
        currentIds.includes(propertyId)
          ? currentIds.filter((id) => id !== propertyId)
          : currentIds,
      )
    },
    [commitFavoriteIds],
  )

  const clearFavorites = useCallback(() => {
    commitFavoriteIds((currentIds) =>
      currentIds.length > 0 ? [] : currentIds,
    )
  }, [commitFavoriteIds])

  useEffect(() => {
    function handleStorage(event) {
      if (event.key !== favoritesStorageKey) return

      setFavoriteIds(
        event.newValue
          ? normalizeStorageEventValue(event.newValue, currentPropertyIds)
          : [],
      )
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [currentPropertyIds])

  const value = useMemo(
    () => ({
      clearFavorites,
      count: visibleFavoriteIds.length,
      favoriteIds: visibleFavoriteIds,
      isFavorite,
      removeFavorite,
      toggleFavorite,
    }),
    [
      clearFavorites,
      visibleFavoriteIds,
      isFavorite,
      removeFavorite,
      toggleFavorite,
    ],
  )

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  )
}

function normalizeStorageEventValue(serializedValue, currentPropertyIds) {
  try {
    return readFavoriteIds(
      {
        getItem: () => serializedValue,
      },
      currentPropertyIds,
    )
  } catch {
    return []
  }
}
