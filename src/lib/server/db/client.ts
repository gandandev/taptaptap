import 'dotenv/config'

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
  const databaseUrl = env.DATABASE_PRIVATE_URL || env.DATABASE_URL

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

function getBoolean(value: string | undefined, fallback: boolean) {
  if (!value) {
    return fallback
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

export function getDb(): AppDb {
  if (globalForDb.__taptaptapDb) {
    return globalForDb.__taptaptapDb
  }

  const pool =
    globalForDb.__taptaptapPgPool ??
    new Pool({
      connectionString: getDatabaseUrl(),
      max: getPositiveInteger(env.PG_POOL_MAX, 5),
      idleTimeoutMillis: getPositiveInteger(env.PG_IDLE_TIMEOUT_MS, 60_000),
      connectionTimeoutMillis: getPositiveInteger(env.PG_CONNECTION_TIMEOUT_MS, 3_000),
      keepAlive: true,
      allowExitOnIdle: getBoolean(env.PG_ALLOW_EXIT_ON_IDLE, false)
    })

  globalForDb.__taptaptapPgPool = pool

  const db = drizzle(pool, { schema })
  globalForDb.__taptaptapDb = db

  return db
}
