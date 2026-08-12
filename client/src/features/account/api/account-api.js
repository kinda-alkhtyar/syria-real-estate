import { apiGet, apiRequest } from '../../../api/api-client.js'

const profilePath = '/api/v1/users/me'

function profileFrom(response) {
  if (!response?.data?.user?.id) {
    throw new TypeError('The profile response is invalid.')
  }
  return response.data.user
}

export async function fetchMyProfile({ signal } = {}) {
  return profileFrom(await apiGet(profilePath, { signal }))
}

export async function updateMyProfile(payload, { signal } = {}) {
  return profileFrom(
    await apiRequest(profilePath, { body: payload, method: 'PATCH', signal }),
  )
}

/**
 * Answers 204 with no body on success, and leaves the session cookie alone, so
 * the caller stays signed in and there is nothing to read back.
 */
export async function changeMyPassword(payload, { signal } = {}) {
  await apiRequest(`${profilePath}/password`, {
    body: payload,
    method: 'POST',
    signal,
  })
}
