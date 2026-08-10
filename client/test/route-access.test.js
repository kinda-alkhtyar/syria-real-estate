import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  getRequestedPath,
  getSafeReturnPath,
  resolveRouteAccess,
} from '../src/features/auth/routing/route-access.js'
import { messages } from '../src/i18n/messages/index.js'
import { translate } from '../src/i18n/translate.js'

const owner = { id: 'owner-id', role: 'OWNER' }
const admin = { id: 'admin-id', role: 'ADMIN' }
const user = { id: 'user-id', role: 'USER' }

test('keeps the protected route loading while session restoration runs', () => {
  assert.equal(
    resolveRouteAccess({
      allowedRoles: ['OWNER', 'ADMIN'],
      status: 'loading',
      user: null,
    }),
    'loading',
  )
  for (const locale of ['ar', 'en', 'de']) {
    assert.notEqual(
      translate(messages, locale, 'en', 'auth.restoringSession'),
      'auth.restoringSession',
    )
  }
})

test('redirects unauthenticated users to login', () => {
  assert.equal(
    resolveRouteAccess({ status: 'unauthenticated', user: null }),
    'login',
  )
})

test('allows any successfully authenticated user', () => {
  assert.equal(
    resolveRouteAccess({ status: 'authenticated', user }),
    'allowed',
  )
})

test('allows OWNER through the property-manager guard', () => {
  assert.equal(
    resolveRouteAccess({
      allowedRoles: ['OWNER', 'ADMIN'],
      status: 'authenticated',
      user: owner,
    }),
    'allowed',
  )
})

test('allows ADMIN through the property-manager guard', () => {
  assert.equal(
    resolveRouteAccess({
      allowedRoles: ['OWNER', 'ADMIN'],
      status: 'authenticated',
      user: admin,
    }),
    'allowed',
  )
})

test('renders the forbidden state for an authenticated disallowed role', () => {
  assert.equal(
    resolveRouteAccess({
      allowedRoles: ['OWNER', 'ADMIN'],
      status: 'authenticated',
      user,
    }),
    'forbidden',
  )
  for (const locale of ['ar', 'en', 'de']) {
    assert.notEqual(
      translate(messages, locale, 'en', 'auth.forbiddenTitle'),
      'auth.forbiddenTitle',
    )
  }
})

test('preserves a safe original route through login', () => {
  const requested = getRequestedPath({
    hash: '#images',
    pathname: '/management/properties/property-id',
    search: '?tab=details',
  })

  assert.equal(
    getSafeReturnPath({ from: requested }),
    '/management/properties/property-id?tab=details#images',
  )
})

test('rejects unsafe and login return paths to prevent redirect loops', () => {
  for (const from of [
    '/login',
    '/login?from=management',
    '/login#form',
    '//attacker.example',
    'https://attacker.example',
    undefined,
  ]) {
    assert.equal(getSafeReturnPath({ from }), '/')
  }
})

test('keeps every existing public route outside authentication guards', () => {
  const appSource = readFileSync(
    new URL('../src/App.jsx', import.meta.url),
    'utf8',
  )

  const publicLayoutStart = appSource.indexOf(
    '<Route element={<MainLayout />}>',
  )
  assert.ok(publicLayoutStart > -1)
  const publicRoutes = appSource.slice(publicLayoutStart)

  assert.match(publicRoutes, /<Route index element={<HomePage \/>} \/>/)
  for (const path of [
    'favorites',
    'login',
    'properties',
    'properties/:propertyId',
  ]) {
    assert.match(publicRoutes, new RegExp(`path="${path.replace('/', '\\/')}"`))
  }
  assert.match(appSource, /<Route element={<OwnerAdminRoute \/>}>/)
  assert.match(appSource, /path="dashboard"/)
  assert.match(appSource, /path="properties\/new"/)
})
