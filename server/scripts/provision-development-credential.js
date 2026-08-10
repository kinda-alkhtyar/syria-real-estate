import { pathToFileURL } from 'node:url'

import '../src/config/load-env.js'
import {
  findUserForAuthentication,
  updateUserCredential,
} from '../src/repositories/user.repository.js'
import { normalizeEmail } from '../src/utils/email.js'
import {
  hashPassword,
  maximumPasswordBytes,
  verifyPassword,
} from '../src/utils/password.js'

export const minimumProvisioningPasswordCharacters = 15
export const provisioningSuccessMessage =
  'Development credential updated successfully.'

function requiredValue(environment, name) {
  const value = environment[name]

  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${name} is required.`)
  }

  return value
}

export async function provisionDevelopmentCredential({
  environment = process.env,
  userRepository = {
    findUserForAuthentication,
    updateUserCredential,
  },
  passwordUtility = {
    hashPassword,
    verifyPassword,
  },
} = {}) {
  if (environment.NODE_ENV === 'production') {
    throw new Error('Development credential provisioning is disabled.')
  }

  const email = normalizeEmail(
    requiredValue(environment, 'AUTH_PROVISION_EMAIL'),
  )
  const password = requiredValue(
    environment,
    'AUTH_PROVISION_PASSWORD',
  )

  if (!email) {
    throw new Error('AUTH_PROVISION_EMAIL is invalid.')
  }

  if ([...password].length < minimumProvisioningPasswordCharacters) {
    throw new Error(
      `AUTH_PROVISION_PASSWORD must contain at least ${minimumProvisioningPasswordCharacters} characters.`,
    )
  }

  if (Buffer.byteLength(password, 'utf8') > maximumPasswordBytes) {
    throw new Error(
      `AUTH_PROVISION_PASSWORD must not exceed ${maximumPasswordBytes} UTF-8 bytes.`,
    )
  }

  const user = await userRepository.findUserForAuthentication(email)

  if (!user) {
    throw new Error('The target development user does not exist.')
  }

  const passwordAlreadyMatches =
    typeof user.passwordHash === 'string' &&
    (await passwordUtility.verifyPassword(user.passwordHash, password))
  const shouldActivate =
    environment.AUTH_PROVISION_ACTIVATE === 'true' && !user.isActive
  const data = {}

  if (!passwordAlreadyMatches) {
    data.passwordHash = await passwordUtility.hashPassword(password)
  }

  if (shouldActivate) {
    data.isActive = true
  }

  if (Object.keys(data).length > 0) {
    await userRepository.updateUserCredential(user.id, data)
  }

  return provisioningSuccessMessage
}

async function main() {
  try {
    const message = await provisionDevelopmentCredential()
    console.log(message)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main()
}
