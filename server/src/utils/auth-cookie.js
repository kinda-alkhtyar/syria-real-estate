import env from '../config/env.js'

function parseCookie(cookieHeader, cookieName) {
  if (typeof cookieHeader !== 'string') {
    return null
  }

  for (const segment of cookieHeader.split(';')) {
    const separator = segment.indexOf('=')
    if (separator < 1) continue

    const name = segment.slice(0, separator).trim()
    if (name !== cookieName) continue

    const value = segment.slice(separator + 1).trim()
    if (!value) return null

    try {
      return decodeURIComponent(value)
    } catch {
      return null
    }
  }

  return null
}

export function createAuthCookieManager({
  name = env.authCookieName,
  secure = env.nodeEnv === 'production',
  now = () => new Date(),
} = {}) {
  const baseOptions = Object.freeze({
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
  })

  return {
    name,

    read(request) {
      return parseCookie(request.headers.cookie, name)
    },

    set(response, rawToken, expiresAt) {
      response.cookie(name, rawToken, {
        ...baseOptions,
        maxAge: Math.max(0, expiresAt.getTime() - now().getTime()),
      })
    },

    clear(response) {
      response.clearCookie(name, baseOptions)
    },
  }
}

const authCookieManager = createAuthCookieManager()

export default authCookieManager
