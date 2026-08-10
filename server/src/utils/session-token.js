import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'

const sessionTokenBytes = 32

export function generateSessionToken() {
  return randomBytes(sessionTokenBytes).toString('base64url')
}

export function hashSessionToken(rawToken) {
  if (typeof rawToken !== 'string' || rawToken.length === 0) {
    throw new TypeError('Session token must be a non-empty string.')
  }

  return createHash('sha256').update(rawToken, 'utf8').digest('hex')
}

export function sessionTokenHashesEqual(leftHash, rightHash) {
  if (
    typeof leftHash !== 'string' ||
    typeof rightHash !== 'string' ||
    !/^[a-f0-9]{64}$/i.test(leftHash) ||
    !/^[a-f0-9]{64}$/i.test(rightHash)
  ) {
    return false
  }

  return timingSafeEqual(
    Buffer.from(leftHash, 'hex'),
    Buffer.from(rightHash, 'hex'),
  )
}
