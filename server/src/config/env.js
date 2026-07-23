import 'dotenv/config'

import { z } from 'zod'

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CORS_ORIGINS: z.string().min(1, 'CORS_ORIGINS must contain at least one URL.'),
})

const result = environmentSchema.safeParse(process.env)

if (!result.success) {
  const details = result.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ')

  throw new Error(`Invalid environment configuration: ${details}`)
}

const corsOrigins = result.data.CORS_ORIGINS
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const invalidOrigin = corsOrigins.find(
  (origin) => !z.string().url().safeParse(origin).success,
)

if (invalidOrigin) {
  throw new Error(`Invalid CORS origin URL: ${invalidOrigin}`)
}

const env = Object.freeze({
  nodeEnv: result.data.NODE_ENV,
  port: result.data.PORT,
  corsOrigins: Object.freeze(corsOrigins),
})

export default env
