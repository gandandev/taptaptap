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

function getPositiveInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback
  }

  const parsed = Number.parseInt(value, 10)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function getDb(): AppDb {
  if (globalForDb.__taptaptapDb) {
    return globalForDb.__taptaptapDb
  }

  const pool =
    globalForDb.__taptaptapPgPool ??
    new Pool({
      connectionString: getDatabaseUrl(),
      max: getPositiveInteger(env.PG_POOL_MAX, 2),
      idleTimeoutMillis: getPositiveInteger(env.PG_IDLE_TIMEOUT_MS, 10_000),
      connectionTimeoutMillis: getPositiveInteger(env.PG_CONNECTION_TIMEOUT_MS, 5_000),
      allowExitOnIdle: true
    })

  globalForDb.__taptaptapPgPool = pool

  const db = drizzle(pool, { schema })
  globalForDb.__taptaptapDb = db

  return db
}
