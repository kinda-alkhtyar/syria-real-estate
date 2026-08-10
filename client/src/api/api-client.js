export class ApiError extends Error {
  constructor(message, { code = '', status = 0 } = {}) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

function getConfiguredApiBaseUrl() {
  const configuredUrl =
    import.meta.env.VITE_API_BASE_URL?.trim() ||
    (import.meta.env.DEV ? 'http://localhost:3000' : '')

  return configuredUrl
}

function normalizeApiBaseUrl(configuredUrl) {
  if (!configuredUrl) {
    throw new ApiError('The frontend API base URL is not configured.')
  }

  try {
    const url = new URL(configuredUrl)
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error()
    return url.toString().replace(/\/$/, '')
  } catch {
    throw new ApiError('The frontend API base URL is invalid.')
  }
}

function isFormData(body) {
  return typeof FormData !== 'undefined' && body instanceof FormData
}

export function createApiClient({
  baseUrl,
  fetchImplementation = globalThis.fetch,
} = {}) {
  return {
    async request(path, { body, method = 'GET', signal } = {}) {
      let response
      const multipart = isFormData(body)

      try {
        const apiBaseUrl = normalizeApiBaseUrl(
          baseUrl ?? getConfiguredApiBaseUrl(),
        )
        response = await fetchImplementation(`${apiBaseUrl}${path}`, {
          body:
            body === undefined
              ? undefined
              : multipart
                ? body
                : JSON.stringify(body),
          credentials: 'include',
          headers: {
            Accept: 'application/json',
            ...(body === undefined || multipart
              ? {}
              : { 'Content-Type': 'application/json' }),
          },
          method,
          signal,
        })
      } catch (error) {
        if (error.name === 'AbortError') throw error
        if (error instanceof ApiError) throw error
        throw new ApiError('The API request could not be completed.', {
          code: 'NETWORK_ERROR',
        })
      }

      let responseBody = null
      if (response.status !== 204) {
        try {
          responseBody = await response.json()
        } catch {
          throw new ApiError('The API returned an invalid response.', {
            status: response.status,
          })
        }
      }

      if (!response.ok) {
        throw new ApiError(
          responseBody?.error?.message || 'The API request failed.',
          {
            code: responseBody?.error?.code,
            status: response.status,
          },
        )
      }

      return responseBody
    },
  }
}

const defaultApiClient = createApiClient()

export function apiRequest(path, options) {
  return defaultApiClient.request(path, options)
}

export function apiGet(path, options) {
  return apiRequest(path, options)
}
