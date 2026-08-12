// The contact rule is the server's, and the offices form already states it
// once; a third copy would be a third thing to keep in step.
import { isValidContactNumber } from '../../offices/forms/office-form.js'

export { isValidContactNumber }

export const accountFieldLimits = Object.freeze({
  name: 160,
  phone: 32,
  whatsapp: 32,
})

// Mirrors the server policy on POST /users/me/password. Counted in code points,
// the same way the person typing counts them.
export const minimumPasswordLength = 12

export const profileFormInitialValues = Object.freeze({
  name: '',
  phone: '',
  whatsapp: '',
})

export const passwordFormInitialValues = Object.freeze({
  confirm: '',
  current: '',
  next: '',
})

const containsHtml = (value) => value.includes('<') || value.includes('>')

/** Fills the edit form from the stored profile. */
export function toProfileFormValues(profile) {
  return {
    name: profile?.name ?? '',
    phone: profile?.phone ?? '',
    whatsapp: profile?.whatsapp ?? '',
  }
}

/**
 * @returns {Record<string, string>} Message keys, keyed by field name.
 */
export function validateProfileForm(values) {
  const errors = {}
  const name = values.name.trim()

  if (!name) errors.name = 'account.errors.nameRequired'
  else if (name.length > accountFieldLimits.name) {
    errors.name = 'account.errors.nameTooLong'
  } else if (containsHtml(name)) errors.name = 'account.errors.noHtml'

  for (const field of ['phone', 'whatsapp']) {
    const value = values[field].trim()
    if (value && !isValidContactNumber(value)) {
      errors[field] = 'account.errors.contactNumber'
    }
  }

  return errors
}

/**
 * The email is deliberately absent: the API rejects it outright, and it is the
 * account's identity rather than a profile field. A cleared number is sent as
 * `null`, which is how the API erases a stored one.
 */
export function toProfilePayload(values) {
  const phone = values.phone.trim()
  const whatsapp = values.whatsapp.trim()

  return {
    name: values.name.trim(),
    phone: phone || null,
    whatsapp: whatsapp || null,
  }
}

/**
 * The confirmation field exists only here: the API takes one new password, and
 * a typo in a field nobody can read back is the one mistake this dialog has to
 * catch before it is spent on a request.
 */
export function validatePasswordForm(values) {
  const errors = {}

  if (!values.current) errors.current = 'account.errors.currentRequired'

  if ([...values.next].length < minimumPasswordLength) {
    errors.next = 'account.errors.passwordTooShort'
  } else if (values.next === values.current) {
    errors.next = 'account.errors.passwordSame'
  }

  if (values.confirm !== values.next) {
    errors.confirm = 'account.errors.passwordMismatch'
  }

  return errors
}

export function toPasswordPayload(values) {
  return { current: values.current, new: values.next }
}
