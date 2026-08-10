import { z } from 'zod'

import { maximumCredentialLength } from '../utils/google-token.js'
import { maximumPasswordBytes } from '../utils/password.js'

export const loginSchema = z
  .object({
    email: z.string().trim().email().max(254),
    password: z
      .string()
      .min(1)
      .refine(
        (password) =>
          Buffer.byteLength(password, 'utf8') <= maximumPasswordBytes,
        `Password must not exceed ${maximumPasswordBytes} UTF-8 bytes.`,
      ),
  })
  .strict()

export const googleLoginSchema = z
  .object({
    credential: z.string().min(1).max(maximumCredentialLength),
  })
  .strict()
