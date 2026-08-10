import { apiRequest } from '../../../api/api-client.js'

const authPath = '/api/v1/auth'

function userFrom(response) {
  return response?.data?.user
}

export async function login(credentials, options) {
  const response = await apiRequest(`${authPath}/login`, {
    ...options,
    body: credentials,
    method: 'POST',
  })
  return userFrom(response)
}

export async function loginWithGoogle(credential, options) {
  const response = await apiRequest(`${authPath}/google`, {
    ...options,
    body: { credential },
    method: 'POST',
  })
  return userFrom(response)
}

export async function getCurrentUser(options) {
  const response = await apiRequest(`${authPath}/me`, options)
  return userFrom(response)
}

export async function logout(options) {
  await apiRequest(`${authPath}/logout`, {
    ...options,
    method: 'POST',
  })
}
