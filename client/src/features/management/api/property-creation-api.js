import { apiRequest } from '../../../api/api-client.js'

export function createPropertyCreationApi({ request = apiRequest } = {}) {
  return {
    async createProperty(payload, { signal } = {}) {
      const response = await request('/api/v1/properties', {
        body: payload,
        method: 'POST',
        signal,
      })
      if (!response?.data?.id || !response.data.slug) {
        throw new TypeError('The property creation response is invalid.')
      }
      return response.data
    },
  }
}

const propertyCreationApi = createPropertyCreationApi()

export const { createProperty } = propertyCreationApi
