import './load-env.js'

import { z } from 'zod'

const storageEnvironmentSchema = z.object({
  SUPABASE_URL: z
    .string()
    .url()
    .refine((value) => new URL(value).protocol === 'https:', {
      message: 'SUPABASE_URL must use HTTPS.',
    }),
  SUPABASE_SECRET_KEY: z
    .string()
    .min(1)
    .refine(
      (value) =>
        !/\s/.test(value) &&
        (/^sb_secret_[A-Za-z0-9_-]+$/.test(value) ||
          value.split('.').length === 3),
      { message: 'SUPABASE_SECRET_KEY has an invalid format.' },
    ),
  SUPABASE_STORAGE_BUCKET: z
    .string()
    .regex(/^[a-z0-9][a-z0-9._-]*$/),
  // Optional: deployments without a dedicated video bucket keep using the
  // images bucket, so this stays backwards compatible.
  SUPABASE_VIDEO_BUCKET: z
    .string()
    .regex(/^[a-z0-9][a-z0-9._-]*$/)
    .optional(),
})

export function parseStorageEnvironment(environment) {
  const result = storageEnvironmentSchema.safeParse(environment)
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ')
    throw new Error(`Invalid Storage environment configuration: ${details}`)
  }
  return Object.freeze({
    supabaseUrl: result.data.SUPABASE_URL,
    supabaseSecretKey: result.data.SUPABASE_SECRET_KEY,
    supabaseStorageBucket: result.data.SUPABASE_STORAGE_BUCKET,
    supabaseVideoBucket:
      result.data.SUPABASE_VIDEO_BUCKET ?? result.data.SUPABASE_STORAGE_BUCKET,
  })
}

const storageEnv = parseStorageEnvironment(process.env)

export default storageEnv
