import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Fallback für lokale Entwicklung, falls DATABASE_URL nicht gesetzt ist
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./prisma/dev.db'
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Reduziertes Logging: keine Query-Logs, kurze Fehlerausgaben
    log: ['error'],
    errorFormat: 'minimal',
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Alias für Kompatibilität
export const prisma = db