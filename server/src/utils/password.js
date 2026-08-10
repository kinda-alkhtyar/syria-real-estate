import argon2 from 'argon2'

export const maximumPasswordBytes = 1024

export const argon2idParameters = Object.freeze({
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  hashLength: 32,
})

function assertPassword(password) {
  if (typeof password !== 'string') {
    throw new TypeError('Password must be a string.')
  }

  if (Buffer.byteLength(password, 'utf8') > maximumPasswordBytes) {
    throw new RangeError(
      `Password must not exceed ${maximumPasswordBytes} UTF-8 bytes.`,
    )
  }
}

export function hashPassword(password) {
  assertPassword(password)
  return argon2.hash(password, argon2idParameters)
}

export async function verifyPassword(passwordHash, password) {
  if (
    typeof passwordHash !== 'string' ||
    typeof password !== 'string' ||
    Buffer.byteLength(password, 'utf8') > maximumPasswordBytes
  ) {
    return false
  }

  try {
    return await argon2.verify(passwordHash, password, {
      type: argon2.argon2id,
    })
  } catch {
    return false
  }
}
