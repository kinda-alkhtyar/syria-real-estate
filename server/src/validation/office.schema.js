import { z } from 'zod'

import {
  contactNumberSchema,
  enumValue,
  governorates,
  nullableText,
  optionalEnum,
  paginationFields,
  requiredText,
} from './property.schema.js'

// A logo is served from the project's own storage, so only an absolute http(s)
// URL is accepted: a `javascript:` or `data:` value would otherwise reach every
// consumer that renders the office card.
const logoUrlSchema = z
  .union([
    z
      .string()
      .trim()
      .min(1)
      .max(2_048)
      .refine((value) => {
        try {
          const { protocol } = new URL(value)
          return protocol === 'http:' || protocol === 'https:'
        } catch {
          return false
        }
      }, 'Logo URL must be an absolute http(s) URL.'),
    z.null(),
  ])
  .optional()

// `ownerId` is absent by design: the office is always attached to the session
// user. The schemas are strict, so a submitted owner is rejected rather than
// silently ignored.
const officeFields = {
  nameAr: requiredText(160),
  nameEn: requiredText(160),
  nameDe: requiredText(160),
  descriptionAr: nullableText(5_000),
  descriptionEn: nullableText(5_000),
  descriptionDe: nullableText(5_000),
  governorate: enumValue(governorates),
  city: nullableText(120),
  phone: contactNumberSchema('Phone number'),
  whatsapp: contactNumberSchema('WhatsApp number'),
  logoUrl: logoUrlSchema,
}

export const officeCreateSchema = z.object(officeFields).strict()

export const officeUpdateSchema = z
  .object({
    ...officeFields,
    // Only the three names and the governorate are required on create; on
    // update every field is optional, but at least one must be present.
    nameAr: officeFields.nameAr.optional(),
    nameEn: officeFields.nameEn.optional(),
    nameDe: officeFields.nameDe.optional(),
    governorate: optionalEnum(governorates),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one office field is required.',
  })

// The primary key is a cuid, not a uuid like every other model, so the route
// parameter is constrained to the URL-safe token shape rather than a uuid.
export const officeIdSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z0-9_-]+$/, 'Office id is not a valid identifier.'),
  })
  .strict()

export const officeQuerySchema = z
  .object({
    governorate: optionalEnum(governorates),
    ...paginationFields,
  })
  .strict()

// The detail route pages through the office's listings, so it accepts the
// pagination parameters and nothing else.
export const officePropertiesQuerySchema = z
  .object({ ...paginationFields })
  .strict()
