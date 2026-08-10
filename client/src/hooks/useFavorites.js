import { useContext } from 'react'

import { FavoritesContext } from '../features/favorites/favorites-context.js'

export function useFavorites() {
  const context = useContext(FavoritesContext)

  if (!context) {
    throw new Error('useFavorites must be used within FavoritesProvider.')
  }

  return context
}
