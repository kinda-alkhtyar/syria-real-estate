import './load-env.js'

import { z } from 'zod'

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CORS_ORIGINS: z.string().min(1, 'CORS_ORIGINS must contain at least one URL.'),
  AUTH_SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(12),
  AUTH_COOKIE_NAME: z
    .string()
    .regex(/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/)
    .default('syria_re_session'),
  AUTH_LOGIN_RATE_LIMIT: z.coerce.number().int().min(1).max(100).default(5),
  AUTH_LOGIN_RATE_WINDOW_MINUTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(60)
    .default(15),
  TRUST_PROXY: z.string().trim().default('false'),
  // Optional: Google sign-in stays switched off until an OAuth client is set.
  GOOGLE_CLIENT_ID: z.string().trim().default(''),
})

/**
 * Express `trust proxy` accepts a boolean, a hop count, or an address list.
 * The default is `false` so a directly exposed process never believes a
 * spoofed X-Forwarded-For header; deployments behind a proxy must opt in.
 */
export function parseTrustProxy(value) {
  if (value === '' || value === 'false') return false
  if (value === 'true') return true
  if (/^\d+$/.test(value)) return Number(value)
  return value
}

export function parseApplicationEnvironment(environment) {
  const result = environmentSchema.safeParse(environment)
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
    throw new Error('Invalid CORS origin URL.')
  }

  return Object.freeze({
    nodeEnv: result.data.NODE_ENV,
    port: result.data.PORT,
    corsOrigins: Object.freeze(corsOrigins),
    authSessionTtlHours: result.data.AUTH_SESSION_TTL_HOURS,
    authCookieName: result.data.AUTH_COOKIE_NAME,
    authLoginRateLimit: result.data.AUTH_LOGIN_RATE_LIMIT,
    authLoginRateWindowMinutes: result.data.AUTH_LOGIN_RATE_WINDOW_MINUTES,
    trustProxy: parseTrustProxy(result.data.TRUST_PROXY),
    googleClientId: result.data.GOOGLE_CLIENT_ID,
  })
}

const env = parseApplicationEnvironment(process.env)

export default env
