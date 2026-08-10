import env from '../config/env.js'

const tokenInfoEndpoint = 'https://oauth2.googleapis.com/tokeninfo'

// Google mints both forms; the bare host is the legacy value still in use.
const allowedIssuers = new Set([
  'accounts.google.com',
  'https://accounts.google.com',
])

// A Google ID token is a JWT of roughly 1 KB. The ceiling only stops an
// oversized body from being forwarded to Google.
export const maximumCredentialLength = 4096

export function invalidGoogleCredentialError() {
  const error = new Error('The Google credential could not be verified.')
  error.code = 'INVALID_GOOGLE_CREDENTIAL'
  error.statusCode = 401
  return error
}

export function googleUnavailableError() {
  const error = new Error('Google sign-in is unavailable.')
  error.code = 'GOOGLE_UNAVAILABLE'
  error.statusCode = 502
  return error
}

/**
 * Verifies a Google ID token through Google's public tokeninfo endpoint.
 *
 * Delegating signature and expiry checks to Google keeps the platform free of a
 * JWT/JWKS dependency. Every claim that authorises the caller is still asserted
 * here, because tokeninfo validates the token itself but not who it was for.
 */
export function createGoogleTokenVerifier({
  clientId = env.googleClientId,
  fetchImplementation = globalThis.fetch,
} = {}) {
  return async function verifyGoogleIdToken(credential) {
    if (
      typeof credential !== 'string' ||
      credential.length === 0 ||
      credential.length > maximumCredentialLength
    ) {
      throw invalidGoogleCredentialError()
    }

    let response
    try {
      response = await fetchImplementation(
        `${tokenInfoEndpoint}?id_token=${encodeURIComponent(credential)}`,
        { headers: { Accept: 'application/json' }, method: 'GET' },
      )
    } catch {
      // A transport failure is not the caller's fault, so it must not be
      // reported as an invalid credential.
      throw googleUnavailableError()
    }

    if (response.status >= 500) throw googleUnavailableError()
    if (!response.ok) throw invalidGoogleCredentialError()

    let payload
    try {
      payload = await response.json()
    } catch {
      throw googleUnavailableError()
    }

    // tokeninfo returns every claim as a string.
    const emailVerified =
      payload?.email_verified === true || payload?.email_verified === 'true'

    if (
      !payload?.sub ||
      !payload?.email ||
      !emailVerified ||
      payload.aud !== clientId ||
      !allowedIssuers.has(payload.iss)
    ) {
      throw invalidGoogleCredentialError()
    }

    return {
      email: payload.email,
      googleSub: payload.sub,
      name:
        typeof payload.name === 'string' && payload.name.trim().length > 0
          ? payload.name.trim()
          : payload.email,
    }
  }
}

export const verifyGoogleIdToken = createGoogleTokenVerifier()
