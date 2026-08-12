import { apiGet, apiRequest } from '../../../api/api-client.js'

/**
 * The API caps `pageSize` at 100 and `page` at 200; both requests stay well
 * inside those bounds and the page number is clamped before it is sent.
 */
export const officesPerPage = 12
export const officePropertiesPerPage = 9

const maximumPage = 200

function pageQuery(page, pageSize) {
  const safePage = Math.min(Math.max(Math.trunc(page) || 1, 1), maximumPage)
  return new URLSearchParams({
    page: String(safePage),
    pageSize: String(pageSize),
  })
}

export async function fetchOffices({ page = 1, signal } = {}) {
  const response = await apiGet(
    `/api/v1/offices?${pageQuery(page, officesPerPage)}`,
    { signal },
  )

  if (!Array.isArray(response?.data) || !response?.meta) {
    throw new TypeError('The office collection response is invalid.')
  }

  return response
}

/**
 * The signed-in owner's own office. A 404 is the API's way of saying "not
 * created yet", so callers translate it rather than treating it as a failure.
 */
export async function fetchMyOffice({ signal } = {}) {
  const response = await apiGet('/api/v1/offices/mine', { signal })

  if (!response?.data?.id) {
    throw new TypeError('The own-office response is invalid.')
  }

  return response.data
}

export async function createOffice(payload, { signal } = {}) {
  const response = await apiRequest('/api/v1/offices', {
    body: payload,
    method: 'POST',
    signal,
  })

  if (!response?.data?.id) {
    throw new TypeError('The office creation response is invalid.')
  }

  return response.data
}

export async function updateOffice(officeId, payload, { signal } = {}) {
  const response = await apiRequest(
    `/api/v1/offices/${encodeURIComponent(officeId)}`,
    { body: payload, method: 'PATCH', signal },
  )

  if (!response?.data?.id) {
    throw new TypeError('The office update response is invalid.')
  }

  return response.data
}

/**
 * Closes the office. The listings it held are not deleted with it: the API
 * unlinks them and they stay published, so nothing else needs refreshing
 * beyond the caller's own view of the office.
 */
export async function deleteOffice(officeId, { signal } = {}) {
  const response = await apiRequest(
    `/api/v1/offices/${encodeURIComponent(officeId)}`,
    { method: 'DELETE', signal },
  )

  if (!response?.data?.id) {
    throw new TypeError('The office deletion response is invalid.')
  }

  return response.data
}

export async function fetchOffice(officeId, { page = 1, signal } = {}) {
  const response = await apiGet(
    `/api/v1/offices/${encodeURIComponent(officeId)}?${pageQuery(
      page,
      officePropertiesPerPage,
    )}`,
    { signal },
  )

  if (!response?.data || !Array.isArray(response?.properties?.data)) {
    throw new TypeError('The office detail response is invalid.')
  }

  return response
}
