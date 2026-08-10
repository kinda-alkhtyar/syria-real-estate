import { ApiError, apiRequest } from '../../../api/api-client.js'

// The management API exposes only a paginated list, so a single property is
// located by walking that list. The bound keeps a malformed id from paging
// through an unlimited number of requests.
const lookupPageSize = 100
const lookupMaximumPages = 10

export function createManagementPropertyApi({
  request = apiRequest,
} = {}) {
  async function fetchProperties({ page = 1, pageSize = 20, signal } = {}) {
    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      sort: 'updated-newest',
    })
    const response = await request(
      `/api/v1/management/properties?${query}`,
      { signal },
    )

    if (!Array.isArray(response?.data) || !response?.meta) {
      throw new TypeError('The management property response is invalid.')
    }
    return response
  }

  async function fetchProperty(id, { signal } = {}) {
    for (let page = 1; page <= lookupMaximumPages; page += 1) {
      const response = await fetchProperties({
        page,
        pageSize: lookupPageSize,
        signal,
      })
      const match = response.data.find((property) => property.id === id)
      if (match) return match
      if (page >= (response.meta.totalPages ?? 0)) break
    }

    throw new ApiError('The requested property was not found.', {
      code: 'PROPERTY_NOT_FOUND',
      status: 404,
    })
  }

  async function writeProperty(path, { body, signal } = {}) {
    const response = await request(path, { body, method: 'PATCH', signal })
    if (!response?.data?.id) {
      throw new TypeError('The property response is invalid.')
    }
    return response.data
  }

  return {
    archiveProperty(id, { signal } = {}) {
      return writeProperty(`/api/v1/properties/${id}/archive`, { signal })
    },

    fetchProperties,
    fetchProperty,

    restoreProperty(id, { signal } = {}) {
      return writeProperty(`/api/v1/properties/${id}/restore`, { signal })
    },

    updateProperty(id, payload, { signal } = {}) {
      return writeProperty(`/api/v1/properties/${id}`, {
        body: payload,
        signal,
      })
    },
  }
}

const managementPropertyApi = createManagementPropertyApi()

export const {
  archiveProperty,
  fetchProperties: fetchManagementProperties,
  fetchProperty: fetchManagementProperty,
  restoreProperty,
  updateProperty,
} = managementPropertyApi
