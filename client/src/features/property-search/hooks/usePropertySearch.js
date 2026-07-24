import { useState, useCallback } from 'react'

/**
 * usePropertySearch
 * Manages property search form state and submission
 */

export function usePropertySearch() {
  const [searchParams, setSearchParams] = useState({
    intent: 'buy',
    governorate: '',
    propertyType: '',
  })

  const handleChange = useCallback((event) => {
    const { name, value } = event.target
    setSearchParams((prev) => ({
      ...prev,
      [name]: value,
    }))
  }, [])

  const handleSubmit = useCallback((event) => {
    event.preventDefault()
    // TODO: Implement search navigation or API call
    console.log('Search submitted with params:', searchParams)
  }, [searchParams])

  return {
    searchParams,
    handleChange,
    handleSubmit,
  }
}
