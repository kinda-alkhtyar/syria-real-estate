import { z } from 'zod'

export const propertyVideoParamsSchema = z
  .object({ propertyId: z.string().uuid() })
  .strict()
