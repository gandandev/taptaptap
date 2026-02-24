import { env } from '$env/dynamic/private'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from './schema'

type AppDb = NodePgDatabase<typeof schema>

const globalForDb = globalThis as typeof globalThis & {
  __taptaptapDb?: AppDb
  __taptaptapPgPool?: Pool
}

function getDatabaseUrl() {
  const databaseUrl = env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required')
  }

  return databaseUrl
}

export function getDb(): AppDb {
  if (globalForDb.__taptaptapDb) {
    return globalForDb.__taptaptapDb
  }

  const pool =
    globalForDb.__taptaptapPgPool ??
    new Pool({
      connectionString: getDatabaseUrl()
    })

  globalForDb.__taptaptapPgPool = pool

  const db = drizzle(pool, { schema })
  globalForDb.__taptaptapDb = db

  return db
}
