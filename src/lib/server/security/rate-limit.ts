type RateLimitEntry = {
  count: number
  resetAt: number
}

type RateLimitCheckInput = {
  bucket: string
  key: string
  limit: number
  windowMs: number
}

type RateLimitCheckResult =
  | {
      ok: true
      remaining: number
      resetAt: number
    }
  | {
      ok: false
      retryAfterSec: number
      resetAt: number
    }

const globalForRateLimit = globalThis as typeof globalThis & {
  __taptaptapRateLimitStore?: Map<string, RateLimitEntry>
  __taptaptapRateLimitLastPruneAt?: number
}

const rateLimitStore = globalForRateLimit.__taptaptapRateLimitStore ?? new Map<string, RateLimitEntry>()
globalForRateLimit.__taptaptapRateLimitStore = rateLimitStore

function makeStoreKey(bucket: string, key: string) {
  return `${bucket}:${key}`
}

function pruneExpiredEntries(now: number) {
  const lastPruneAt = globalForRateLimit.__taptaptapRateLimitLastPruneAt ?? 0

  if (now - lastPruneAt < 30_000) {
    return
  }

  globalForRateLimit.__taptaptapRateLimitLastPruneAt = now

  for (const [storeKey, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(storeKey)
    }
  }
}

export function checkRateLimit(input: RateLimitCheckInput): RateLimitCheckResult {
  const now = Date.now()
  pruneExpiredEntries(now)

  const storeKey = makeStoreKey(input.bucket, input.key)
  const current = rateLimitStore.get(storeKey)

  if (!current || current.resetAt <= now) {
    const resetAt = now + input.windowMs
    rateLimitStore.set(storeKey, {
      count: 1,
      resetAt
    })

    return {
      ok: true,
      remaining: Math.max(0, input.limit - 1),
      resetAt
    }
  }

  if (current.count >= input.limit) {
    const retryAfterMs = Math.max(0, current.resetAt - now)

    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      resetAt: current.resetAt
    }
  }

  current.count += 1
  rateLimitStore.set(storeKey, current)

  return {
    ok: true,
    remaining: Math.max(0, input.limit - current.count),
    resetAt: current.resetAt
  }
}
