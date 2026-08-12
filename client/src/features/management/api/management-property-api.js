import { ApiError, apiRequest } from '../../../api/api-client.js'
import { pendingReviewFilter } from '../constants/listing-status-presentation.js'

// The management API exposes only a paginated list, so a single property is
// located by walking that list. The bound keeps a malformed id from paging
// through an unlimited number of requests.
const lookupPageSize = 100
const lookupMaximumPages = 10

export function createManagementPropertyApi({
  request = apiRequest,
} = {}) {
  async function fetchProperties({
    page = 1,
    pageSize = 20,
    signal,
    status = '',
  } = {}) {
    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      sort: 'updated-newest',
    })
    // Appended last and only when asked for, so the unfiltered dashboard query
    // string stays exactly as it was.
    if (status) query.set('status', status)
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

  async function writeProperty(path, { body, method = 'PATCH', signal } = {}) {
    const response = await request(path, { body, method, signal })
    if (!response?.data?.id) {
      throw new TypeError('The property response is invalid.')
    }
    return response.data
  }

  // The badge only needs `meta.total`, so it asks for the smallest page the API
  // will serve rather than pulling a queue nobody is looking at yet.
  async function fetchPendingReviewCount({ signal } = {}) {
    const response = await fetchProperties({
      pageSize: 1,
      signal,
      status: pendingReviewFilter,
    })
    return Number(response.meta.total) || 0
  }

  return {
    approveProperty(id, { signal } = {}) {
      return writeProperty(
        `/api/v1/management/properties/${id}/approve`,
        { method: 'POST', signal },
      )
    },

    archiveProperty(id, { signal } = {}) {
      return writeProperty(`/api/v1/properties/${id}/archive`, { signal })
    },

    // The listing is gone, so the response carries nothing but the id it was
    // asked to remove — enough for `writeProperty` to confirm the server acted
    // on the right one.
    deleteProperty(id, { signal } = {}) {
      return writeProperty(`/api/v1/management/properties/${id}`, {
        method: 'DELETE',
        signal,
      })
    },

    fetchPendingReviewCount,
    fetchProperties,
    fetchProperty,

    rejectProperty(id, reason, { signal } = {}) {
      return writeProperty(`/api/v1/management/properties/${id}/reject`, {
        body: { reason: reason.trim() },
        method: 'POST',
        signal,
      })
    },

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
  approveProperty,
  archiveProperty,
  deleteProperty,
  fetchPendingReviewCount,
  fetchProperties: fetchManagementProperties,
  fetchProperty: fetchManagementProperty,
  rejectProperty,
  restoreProperty,
  updateProperty,
} = managementPropertyApi
