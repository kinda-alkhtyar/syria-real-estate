import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { locales } from '../src/constants/locales.js'
import {
  accountFieldLimits,
  minimumPasswordLength,
  passwordFormInitialValues,
  profileFormInitialValues,
  toPasswordPayload,
  toProfileFormValues,
  toProfilePayload,
  validatePasswordForm,
  validateProfileForm,
} from '../src/features/account/forms/account-forms.js'
import { messages } from '../src/i18n/messages/index.js'
import { translate } from '../src/i18n/translate.js'

const localeCodes = locales.map((locale) => locale.code)

function readSource(path) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

const accountHubSource = readSource('../src/pages/AccountPage.jsx')
const accountPageSource = readSource('../src/pages/AccountProfilePage.jsx')

const validProfile = {
  name: 'Owner account',
  phone: '+963 11 222 333',
  whatsapp: '0944 123 456',
}

test('the account hub no longer carries the two placeholder rows', () => {
  for (const key of ['account.settings', 'account.help', 'account.comingSoon']) {
    assert.equal(
      accountHubSource.includes(key),
      false,
      `${key} is still rendered by the hub`,
    )
  }
  // Nothing is left to announce, so the toast and its timer went with them.
  assert.equal(accountHubSource.includes('setToastMessage'), false)
})

test('the removed keys are gone from every locale and used nowhere', () => {
  for (const code of localeCodes) {
    for (const key of ['settings', 'help', 'comingSoon']) {
      assert.equal(
        messages[code].account[key],
        undefined,
        `${code}.js still defines account.${key}`,
      )
    }
  }
})

test('the profile row opens the account page', () => {
  assert.ok(accountHubSource.includes('to="/account/profile"'))
  assert.ok(
    readSource('../src/App.jsx').includes('path="account/profile"'),
    'the route is not registered',
  )
})

test('the guest hub still offers sign-in and nothing else changed for it', () => {
  assert.ok(accountHubSource.includes("t('actions.login')"))
  assert.ok(accountHubSource.includes("t('account.guest')"))
  assert.ok(accountHubSource.includes('state={{ from:'))
})

test('the account page renders the four sections and sign-out', () => {
  for (const key of [
    'account.details.title',
    'account.security.title',
    'account.listings.title',
    'account.office.title',
    'actions.logout',
  ]) {
    assert.ok(
      accountPageSource.includes(`'${key}'`),
      `the page never draws ${key}`,
    )
  }
})

test('the listings and office sections reuse the existing surfaces', () => {
  assert.ok(accountPageSource.includes('ManagementPropertyList'))
  assert.ok(accountPageSource.includes('MyOfficePanel'))
})

test('every account message resolves in all four locales', () => {
  const keys = [
    'account.profileTitle',
    'account.profileDescription',
    'account.details.title',
    'account.details.name',
    'account.details.email',
    'account.details.phone',
    'account.details.whatsapp',
    'account.details.empty',
    'account.details.emailLocked',
    'account.details.edit',
    'account.security.title',
    'account.security.changePassword',
    'account.listings.title',
    'account.office.title',
    'account.office.loading',
    'account.editDialog.title',
    'account.editDialog.save',
    'account.editDialog.cancel',
    'account.passwordDialog.title',
    'account.passwordDialog.current',
    'account.passwordDialog.new',
    'account.passwordDialog.confirm',
    'account.passwordDialog.hint',
    'account.passwordDialog.submit',
    'account.errors.nameRequired',
    'account.errors.nameTooLong',
    'account.errors.noHtml',
    'account.errors.contactNumber',
    'account.errors.currentRequired',
    'account.errors.passwordTooShort',
    'account.errors.passwordSame',
    'account.errors.passwordMismatch',
    'account.feedback.profileSaved',
    'account.feedback.passwordChanged',
    'account.feedback.invalidCurrentPassword',
    'account.feedback.passwordUnavailable',
    'account.feedback.rateLimited',
    'account.feedback.sessionExpired',
  ]

  for (const code of localeCodes) {
    for (const key of keys) {
      const value = translate(messages, code, 'en', key)
      assert.notEqual(value, key, `${code}.js does not resolve ${key}`)
      assert.equal(typeof value, 'string')
    }
  }
})

test('the password hint and length errors interpolate the policy minimum', () => {
  for (const code of localeCodes) {
    for (const key of [
      'account.passwordDialog.hint',
      'account.errors.passwordTooShort',
    ]) {
      const value = translate(messages, code, 'en', key, {
        minimum: minimumPasswordLength,
      })
      assert.ok(
        value.includes(String(minimumPasswordLength)),
        `${code}.js: ${key} does not mention the minimum`,
      )
      assert.equal(value.includes('{minimum}'), false)
    }
  }
})

test('the profile form accepts a complete set of details', () => {
  assert.deepEqual(validateProfileForm(validProfile), {})
})

test('the profile form requires a name and rejects HTML and long names', () => {
  assert.equal(
    validateProfileForm({ ...validProfile, name: '   ' }).name,
    'account.errors.nameRequired',
  )
  assert.equal(
    validateProfileForm({ ...validProfile, name: '<b>x</b>' }).name,
    'account.errors.noHtml',
  )
  assert.equal(
    validateProfileForm({
      ...validProfile,
      name: 'a'.repeat(accountFieldLimits.name + 1),
    }).name,
    'account.errors.nameTooLong',
  )
})

test('the profile form mirrors the server contact rule on both numbers', () => {
  for (const field of ['phone', 'whatsapp']) {
    // Blank clears the stored number, so it is not an error.
    assert.equal(validateProfileForm({ ...validProfile, [field]: '' })[field], undefined)

    for (const value of ['12345', '1234567890123456', 'not a number']) {
      assert.equal(
        validateProfileForm({ ...validProfile, [field]: value })[field],
        'account.errors.contactNumber',
        `${field} accepted "${value}"`,
      )
    }
  }
})

test('the profile payload trims, clears blanks with null, and omits the email', () => {
  const payload = toProfilePayload({
    name: '  Owner account  ',
    phone: '  +963 11 222 333  ',
    whatsapp: '   ',
  })

  assert.deepEqual(payload, {
    name: 'Owner account',
    phone: '+963 11 222 333',
    whatsapp: null,
  })
  assert.equal('email' in payload, false)
  assert.equal('role' in payload, false)
})

test('the profile form is filled from the stored profile', () => {
  assert.deepEqual(
    toProfileFormValues({ name: 'Owner', phone: null, whatsapp: '0944123456' }),
    { name: 'Owner', phone: '', whatsapp: '0944123456' },
  )
  assert.deepEqual(toProfileFormValues(null), profileFormInitialValues)
})

test('the password form accepts a valid change', () => {
  assert.deepEqual(
    validatePasswordForm({
      confirm: 'a-much-better-password',
      current: 'current-password-1',
      next: 'a-much-better-password',
    }),
    {},
  )
})

test('the password form enforces the policy the API enforces', () => {
  const base = {
    confirm: 'a-much-better-password',
    current: 'current-password-1',
    next: 'a-much-better-password',
  }

  assert.equal(
    validatePasswordForm({ ...base, current: '' }).current,
    'account.errors.currentRequired',
  )
  assert.equal(
    validatePasswordForm({
      ...base,
      confirm: 'short',
      next: 'short',
    }).next,
    'account.errors.passwordTooShort',
  )
  // Exactly one character below the minimum is still refused.
  assert.equal(
    validatePasswordForm({
      ...base,
      confirm: 'a'.repeat(minimumPasswordLength - 1),
      next: 'a'.repeat(minimumPasswordLength - 1),
    }).next,
    'account.errors.passwordTooShort',
  )
  assert.equal(
    validatePasswordForm({
      confirm: base.current,
      current: base.current,
      next: base.current,
    }).next,
    'account.errors.passwordSame',
  )
  assert.equal(
    validatePasswordForm({ ...base, confirm: 'something-else-entirely' })
      .confirm,
    'account.errors.passwordMismatch',
  )
  assert.deepEqual(validatePasswordForm(passwordFormInitialValues), {
    current: 'account.errors.currentRequired',
    next: 'account.errors.passwordTooShort',
  })
})

test('the password payload matches the API contract', () => {
  assert.deepEqual(
    toPasswordPayload({
      confirm: 'a-much-better-password',
      current: 'current-password-1',
      next: 'a-much-better-password',
    }),
    { current: 'current-password-1', new: 'a-much-better-password' },
  )
  assert.equal(minimumPasswordLength, 12)
})
