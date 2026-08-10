import { apiGet } from '../../../api/api-client.js'

const pageSize = 100

export async function fetchPropertyCatalog({ signal } = {}) {
  const properties = []
  let page = 1

  while (true) {
    const response = await apiGet(
      `/api/v1/properties?page=${page}&pageSize=${pageSize}`,
      { signal },
    )

    if (!Array.isArray(response.data) || !response.meta) {
      throw new TypeError('The property collection response is invalid.')
    }

    properties.push(...response.data)
    if (page >= response.meta.totalPages) break
    page += 1
  }

  return properties
}

export async function fetchPropertyBySlug(slug, { signal } = {}) {
  const response = await apiGet(
    `/api/v1/properties/${encodeURIComponent(slug)}`,
    { signal },
  )

  if (!response.data) {
    throw new TypeError('The property detail response is invalid.')
  }

  return response.data
}
