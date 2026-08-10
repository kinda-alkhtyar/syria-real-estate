import { PrismaPg } from '@prisma/adapter-pg'

import './load-env.js'
import { PrismaClient } from '../generated/prisma/client.ts'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to connect to PostgreSQL.')
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
  max: 10,
  query_timeout: 10_000,
})

const prisma = new PrismaClient({ adapter })

export default prisma
