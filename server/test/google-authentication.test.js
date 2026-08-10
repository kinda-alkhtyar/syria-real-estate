import assert from 'node:assert/strict'
import { test } from 'node:test'

process.env.CORS_ORIGINS ??= 'https://client.example'

const [
  { createGoogleTokenVerifier },
  { createAuthenticationService },
  { createAuthController },
  { googleLoginSchema },
] = await Promise.all([
  import('../src/utils/google-token.js'),
  import('../src/services/authentication.service.js'),
  import('../src/controllers/auth.controller.js'),
  import('../src/validation/auth.schema.js'),
])

const clientId = '1234.apps.googleusercontent.com'

function tokenInfoResponse(payload, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    async json() {
      return payload
    },
  }
}

function validPayload(overrides = {}) {
  return {
    aud: clientId,
    email: 'Owner@Example.Invalid',
    email_verified: 'true',
    iss: 'https://accounts.google.com',
    name: 'Google owner',
    sub: 'google-subject-1',
    ...overrides,
  }
}

function createVerifier(payload, responseOptions) {
  let requestedUrl = ''
  const verify = createGoogleTokenVerifier({
    clientId,
    async fetchImplementation(url) {
      requestedUrl = url
      return tokenInfoResponse(payload, responseOptions)
    },
  })
  return { requestedUrl: () => requestedUrl, verify }
}

test('accepts a Google token minted for this client and verified address', async () => {
  const { requestedUrl, verify } = createVerifier(validPayload())

  const identity = await verify('header.payload.signature')

  assert.equal(identity.googleSub, 'google-subject-1')
  assert.equal(identity.email, 'Owner@Example.Invalid')
  assert.equal(identity.name, 'Google owner')
  assert.match(
    requestedUrl(),
    /^https:\/\/oauth2\.googleapis\.com\/tokeninfo\?id_token=header\.payload\.signature$/,
  )
})

test('accepts the legacy bare-host issuer and a boolean email_verified', async () => {
  const { verify } = createVerifier(
    validPayload({ email_verified: true, iss: 'accounts.google.com' }),
  )

  const identity = await verify('token')

  assert.equal(identity.googleSub, 'google-subject-1')
})

test('rejects tokens minted for another audience, issuer, or unverified address', async () => {
  const rejected = [
    { aud: 'other-client.apps.googleusercontent.com' },
    { iss: 'https://accounts.example.invalid' },
    { email_verified: 'false' },
    { email: undefined },
    { sub: undefined },
  ]

  for (const overrides of rejected) {
    const { verify } = createVerifier(validPayload(overrides))
    await assert.rejects(verify('token'), (error) => {
      assert.equal(error.code, 'INVALID_GOOGLE_CREDENTIAL')
      assert.equal(error.statusCode, 401)
      return true
    })
  }
})

test('rejects a token Google itself refuses', async () => {
  const { verify } = createVerifier(
    { error_description: 'Invalid Value' },
    { ok: false, status: 400 },
  )

  await assert.rejects(verify('token'), (error) => {
    assert.equal(error.code, 'INVALID_GOOGLE_CREDENTIAL')
    return true
  })
})

test('separates a Google outage from an invalid credential', async () => {
  const outage = createGoogleTokenVerifier({
    clientId,
    async fetchImplementation() {
      throw new Error('socket hang up')
    },
  })
  const serverError = createGoogleTokenVerifier({
    clientId,
    async fetchImplementation() {
      return tokenInfoResponse({}, { ok: false, status: 503 })
    },
  })

  for (const verify of [outage, serverError]) {
    await assert.rejects(verify('token'), (error) => {
      assert.equal(error.code, 'GOOGLE_UNAVAILABLE')
      assert.equal(error.statusCode, 502)
      return true
    })
  }
})

test('rejects an oversized credential without calling Google', async () => {
  let called = false
  const verify = createGoogleTokenVerifier({
    clientId,
    async fetchImplementation() {
      called = true
      return tokenInfoResponse(validPayload())
    },
  })

  await assert.rejects(verify('a'.repeat(4097)), (error) => {
    assert.equal(error.code, 'INVALID_GOOGLE_CREDENTIAL')
    return true
  })
  assert.equal(called, false)
})

function createServiceHarness({ byGoogleSub = null, byEmail = null } = {}) {
  const calls = { created: [], linked: [] }
  const service = createAuthenticationService({
    googleVerifier: async () => ({
      email: 'Owner@Example.Invalid',
      googleSub: 'google-subject-1',
      name: 'Google owner',
    }),
    userRepository: {
      async findUserByGoogleSub() {
        return byGoogleSub
      },
      async findUserForAuthentication(email) {
        calls.lookedUpEmail = email
        return byEmail
      },
      async linkGoogleAccount(id, googleSub) {
        calls.linked.push({ googleSub, id })
        return { ...byEmail, googleSub }
      },
      async createGoogleUser(data) {
        calls.created.push(data)
        return { id: 'created-id', isActive: true, ...data }
      },
    },
  })
  return { calls, service }
}

const activeUser = {
  email: 'owner@example.invalid',
  id: 'user-id',
  isActive: true,
  name: 'Existing owner',
  role: 'ADMIN',
}

test('signs in an already linked Google account without touching email lookup', async () => {
  const { calls, service } = createServiceHarness({ byGoogleSub: activeUser })

  const user = await service.authenticateWithGoogle('token')

  assert.deepEqual(user, {
    email: 'owner@example.invalid',
    id: 'user-id',
    name: 'Existing owner',
    role: 'ADMIN',
  })
  assert.equal(calls.lookedUpEmail, undefined)
  assert.deepEqual(calls.created, [])
})

test('links the Google subject onto an existing account with the same address', async () => {
  const { calls, service } = createServiceHarness({ byEmail: activeUser })

  const user = await service.authenticateWithGoogle('token')

  assert.equal(calls.lookedUpEmail, 'owner@example.invalid')
  assert.deepEqual(calls.linked, [
    { googleSub: 'google-subject-1', id: 'user-id' },
  ])
  assert.deepEqual(calls.created, [])
  // The existing role survives linking; it is never downgraded to the default.
  assert.equal(user.role, 'ADMIN')
})

test('creates an OWNER with a normalized address for a first-time Google user', async () => {
  const { calls, service } = createServiceHarness()

  const user = await service.authenticateWithGoogle('token')

  assert.deepEqual(calls.created, [
    {
      email: 'owner@example.invalid',
      googleSub: 'google-subject-1',
      name: 'Google owner',
      role: 'OWNER',
    },
  ])
  assert.equal(user.role, 'OWNER')
  assert.equal(user.email, 'owner@example.invalid')
})

test('refuses a deactivated account through either resolution path', async () => {
  const inactive = { ...activeUser, isActive: false }

  for (const harness of [
    createServiceHarness({ byGoogleSub: inactive }),
    createServiceHarness({ byEmail: inactive }),
  ]) {
    await assert.rejects(
      harness.service.authenticateWithGoogle('token'),
      (error) => {
        assert.equal(error.code, 'ACCOUNT_DISABLED')
        assert.equal(error.statusCode, 403)
        return true
      },
    )
  }
})

test('answers 503 CONFIGURATION_MISSING before parsing when no client id is set', async () => {
  let serviceCalled = false
  const controller = createAuthController({
    cookieManager: { set() {} },
    googleClientId: () => '',
    service: {
      async authenticateWithGoogle() {
        serviceCalled = true
      },
    },
  })

  await assert.rejects(
    controller.googleLogin({ body: {} }, {}),
    (error) => {
      assert.equal(error.code, 'CONFIGURATION_MISSING')
      assert.equal(error.statusCode, 503)
      return true
    },
  )
  assert.equal(serviceCalled, false)
})

test('issues the same session cookie and body shape as password login', async () => {
  const written = {}
  const controller = createAuthController({
    cookieManager: {
      set(_response, rawToken, expiresAt) {
        written.expiresAt = expiresAt
        written.rawToken = rawToken
      },
    },
    googleClientId: () => clientId,
    service: {
      async authenticateWithGoogle(credential) {
        written.credential = credential
        return { email: 'a@b.invalid', id: 'user-id', name: 'A', role: 'OWNER' }
      },
      async createSession(userId) {
        written.sessionUserId = userId
        return { expiresAt: 'expiry', id: 'session', rawToken: 'raw-token' }
      },
    },
  })
  const response = {
    body: null,
    statusCode: 0,
    json(payload) {
      this.body = payload
      return this
    },
    status(code) {
      this.statusCode = code
      return this
    },
  }

  await controller.googleLogin({ body: { credential: 'token' } }, response)

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.body, {
    data: {
      user: { email: 'a@b.invalid', id: 'user-id', name: 'A', role: 'OWNER' },
    },
  })
  assert.equal(written.credential, 'token')
  assert.equal(written.sessionUserId, 'user-id')
  assert.equal(written.rawToken, 'raw-token')
})

test('rejects unknown body keys and empty credentials', () => {
  assert.equal(googleLoginSchema.safeParse({ credential: 'x' }).success, true)
  assert.equal(googleLoginSchema.safeParse({ credential: '' }).success, false)
  assert.equal(
    googleLoginSchema.safeParse({ credential: 'x', role: 'ADMIN' }).success,
    false,
  )
})
