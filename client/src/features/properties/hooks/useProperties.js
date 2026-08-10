import { useContext } from 'react'

import { PropertiesContext } from '../context/properties-context.js'

export function useProperties() {
  const context = useContext(PropertiesContext)

  if (!context) {
    throw new Error('useProperties must be used within PropertiesProvider.')
  }

  return context
}
