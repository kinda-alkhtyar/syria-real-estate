import { z } from 'zod'

import { maximumPasswordBytes } from '../utils/password.js'

import { contactNumberSchema, requiredText } from './property.schema.js'

// Registration-grade rules applied to a self-service edit: the same length,
// HTML, and contact-number checks a new account would have to satisfy.
export const maximumNameLength = 160

// A new password must clear this bar. Counted in code points, not UTF-16 units,
// so an emoji or an Arabic ligature counts once — the same way the person who
// typed it counts it.
export const minimumPasswordCharacters = 12

const currentPasswordSchema = z
  .string()
  .min(1)
  .refine(
    (password) => Buffer.byteLength(password, 'utf8') <= maximumPasswordBytes,
    `Password must not exceed ${maximumPasswordBytes} UTF-8 bytes.`,
  )

const newPasswordSchema = z
  .string()
  .refine(
    (password) => [...password].length >= minimumPasswordCharacters,
    `New password must contain at least ${minimumPasswordCharacters} characters.`,
  )
  .refine(
    (password) => Buffer.byteLength(password, 'utf8') <= maximumPasswordBytes,
    `New password must not exceed ${maximumPasswordBytes} UTF-8 bytes.`,
  )

/**
 * `email` and `role` are absent by design, and the object is strict, so
 * submitting either is rejected with a 400 rather than silently ignored — the
 * address is the account's identity and is never editable here.
 */
export const userProfileUpdateSchema = z
  .object({
    name: requiredText(maximumNameLength).optional(),
    phone: contactNumberSchema('Phone number'),
    whatsapp: contactNumberSchema('WhatsApp number'),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one profile field is required.',
  })

export const passwordChangeSchema = z
  .object({
    current: currentPasswordSchema,
    new: newPasswordSchema,
  })
  .strict()
  .refine((value) => value.current !== value.new, {
    message: 'The new password must differ from the current one.',
    path: ['new'],
  })
