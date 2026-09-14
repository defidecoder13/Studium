import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Parse the connection string to suppress pg-connection-string v3 warnings
const rawUrl = process.env.DATABASE_URL || ''
const connectionString = rawUrl.replace('sslmode=require', 'sslmode=require&uselibpqcompat=true')

const pool = new Pool({
  connectionString: connectionString || undefined,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
  max: 10,
  // Neon pooler requires keepalive
  keepAlive: true,
})

// Prevent unhandled 'error' from crashing the process (Neon idle disconnect)
pool.on('error', (err) => {
  console.error('[db] pg Pool error (will retry on next query):', err.message)
})

const adapter = new PrismaPg(pool)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
