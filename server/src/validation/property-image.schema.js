import { z } from 'zod'

const uuid = z.string().uuid()

export const propertyImagePropertyParamsSchema = z
  .object({ propertyId: uuid })
  .strict()

export const propertyImageParamsSchema = z
  .object({
    propertyId: uuid,
    imageId: uuid,
  })
  .strict()

// Alt text is rendered into an HTML attribute, so angle brackets are refused
// here for the same reason the property text fields refuse them.
const altText = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine(
    (value) => !value.includes('<') && !value.includes('>'),
    'text cannot contain HTML tags',
  )
  .optional()

export const propertyImageUploadBodySchema = z
  .object({
    altEn: altText,
    altAr: altText,
    altDe: altText,
  })
  .strict()

export const propertyImageOrderSchema = z
  .object({
    imageIds: z.array(uuid).min(1).max(20),
  })
  .strict()
  .superRefine(({ imageIds }, context) => {
    if (new Set(imageIds).size !== imageIds.length) {
      context.addIssue({
        code: 'custom',
        message: 'Image IDs must be unique.',
        path: ['imageIds'],
      })
    }
  })
