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
  // Optional: review alerts stay switched off until both are set, so a
  // deployment without a bot behaves exactly as it did before.
  TELEGRAM_BOT_TOKEN: z.string().trim().default(''),
  TELEGRAM_CHAT_ID: z.string().trim().default(''),
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
    telegramBotToken: result.data.TELEGRAM_BOT_TOKEN,
    telegramChatId: result.data.TELEGRAM_CHAT_ID,
  })
}

/**
 * Configuration that parses cleanly but is dangerous once NODE_ENV is
 * production. Reported at startup rather than rejected: each of these is a
 * legitimate choice for some topology, and refusing to boot would be a worse
 * outage than a loud log line.
 *
 * - TRUST_PROXY_DISABLED: behind a load balancer every request appears to come
 *   from the proxy, so all callers share one rate-limit bucket — the limits
 *   then throttle honest traffic and never isolate an attacker.
 * - INSECURE_CORS_ORIGIN: the session cookie is `secure` in production, so a
 *   plain-HTTP origin can never send it; the origin is either a leftover or a
 *   sign that traffic is expected over HTTP.
 */
export function productionConfigurationWarnings(configuration) {
  if (configuration.nodeEnv !== 'production') return []

  const warnings = []
  if (configuration.trustProxy === false) warnings.push('TRUST_PROXY_DISABLED')
  if (
    configuration.corsOrigins.some(
      (origin) => new URL(origin).protocol !== 'https:',
    )
  ) {
    warnings.push('INSECURE_CORS_ORIGIN')
  }
  return warnings
}

const env = parseApplicationEnvironment(process.env)

export default env
