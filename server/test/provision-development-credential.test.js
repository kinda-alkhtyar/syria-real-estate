import assert from 'node:assert/strict'
import { test } from 'node:test'

process.env.CORS_ORIGINS = 'http://localhost'

const {
  minimumProvisioningPasswordCharacters,
  provisionDevelopmentCredential,
  provisioningSuccessMessage,
} = await import('../scripts/provision-development-credential.js')

const validPassword = 'a'.repeat(minimumProvisioningPasswordCharacters)

function createMocks({
  user = {
    id: 'development-user-id',
    passwordHash: null,
    isActive: true,
  },
  passwordMatches = false,
} = {}) {
  const calls = []
  const userRepository = {
    async findUserForAuthentication(email) {
      calls.push(['find', email])
      return user
    },
    async updateUserCredential(id, data) {
      calls.push(['update', id, data])
      return { id }
    },
  }
  const passwordUtility = {
    async hashPassword(password) {
      calls.push(['hash', password])
      return 'generated-hash'
    },
    async verifyPassword(hash, password) {
      calls.push(['verify', hash, password])
      return passwordMatches
    },
  }

  return { calls, passwordUtility, userRepository }
}

function environment(overrides = {}) {
  return {
    NODE_ENV: 'development',
    AUTH_PROVISION_EMAIL: '  OWNER@Example.Invalid ',
    AUTH_PROVISION_PASSWORD: validPassword,
    AUTH_PROVISION_ACTIVATE: 'false',
    ...overrides,
  }
}

test('requires environment-only email and password inputs', async () => {
  const mocks = createMocks()

  await assert.rejects(
    provisionDevelopmentCredential({
      environment: environment({ AUTH_PROVISION_EMAIL: '' }),
      ...mocks,
    }),
    /AUTH_PROVISION_EMAIL is required/,
  )
  await assert.rejects(
    provisionDevelopmentCredential({
      environment: environment({ AUTH_PROVISION_PASSWORD: '' }),
      ...mocks,
    }),
    /AUTH_PROVISION_PASSWORD is required/,
  )
})

test('rejects production, short passwords, and oversized passwords', async () => {
  const mocks = createMocks()

  await assert.rejects(
    provisionDevelopmentCredential({
      environment: environment({ NODE_ENV: 'production' }),
      ...mocks,
    }),
    /disabled/,
  )
  await assert.rejects(
    provisionDevelopmentCredential({
      environment: environment({ AUTH_PROVISION_PASSWORD: 'too-short' }),
      ...mocks,
    }),
    /at least/,
  )
  await assert.rejects(
    provisionDevelopmentCredential({
      environment: environment({
        AUTH_PROVISION_PASSWORD: 'a'.repeat(1025),
      }),
      ...mocks,
    }),
    /must not exceed/,
  )
})

test('never creates an unknown user', async () => {
  const mocks = createMocks({ user: null })

  await assert.rejects(
    provisionDevelopmentCredential({
      environment: environment(),
      ...mocks,
    }),
    /does not exist/,
  )
  assert.equal(
    mocks.calls.some(([operation]) => operation === 'update'),
    false,
  )
})

test('normalizes email and updates only the password hash by existing user ID', async () => {
  const mocks = createMocks()
  const message = await provisionDevelopmentCredential({
    environment: environment(),
    ...mocks,
  })

  assert.equal(message, provisioningSuccessMessage)
  assert.deepEqual(mocks.calls[0], ['find', 'owner@example.invalid'])
  assert.deepEqual(mocks.calls.at(-1), [
    'update',
    'development-user-id',
    { passwordHash: 'generated-hash' },
  ])
})

test('activates only when explicitly requested', async () => {
  const inactive = {
    id: 'development-user-id',
    passwordHash: null,
    isActive: false,
  }
  const withoutActivation = createMocks({ user: inactive })
  const withActivation = createMocks({ user: inactive })

  await provisionDevelopmentCredential({
    environment: environment(),
    ...withoutActivation,
  })
  await provisionDevelopmentCredential({
    environment: environment({ AUTH_PROVISION_ACTIVATE: 'true' }),
    ...withActivation,
  })

  assert.deepEqual(withoutActivation.calls.at(-1)[2], {
    passwordHash: 'generated-hash',
  })
  assert.deepEqual(withActivation.calls.at(-1)[2], {
    passwordHash: 'generated-hash',
    isActive: true,
  })
})

test('is idempotent when the same password is intentionally supplied again', async () => {
  const mocks = createMocks({
    user: {
      id: 'development-user-id',
      passwordHash: 'existing-hash',
      isActive: true,
    },
    passwordMatches: true,
  })
  const message = await provisionDevelopmentCredential({
    environment: environment(),
    ...mocks,
  })

  assert.equal(message, provisioningSuccessMessage)
  assert.equal(
    mocks.calls.some(([operation]) => operation === 'hash'),
    false,
  )
  assert.equal(
    mocks.calls.some(([operation]) => operation === 'update'),
    false,
  )
})
