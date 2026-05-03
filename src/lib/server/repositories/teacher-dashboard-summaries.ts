import { eq } from 'drizzle-orm'

import { getDb } from '$lib/server/db/client'
import { teacherDashboardSummaries } from '$lib/server/db/schema'

export const TEACHER_DASHBOARD_SUMMARY_ID = 'class-dashboard'

export type StoredTeacherDashboardSummary = {
  id: string
  summaryDate: string
  signature: string
  bullets: string[]
  neededCompetencyId: string
  neededCompetencyLabel: string
  source: 'ai' | 'local'
  generatedAt: Date
}

export function isTeacherDashboardSummaryStorageMissing(error: unknown) {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false
  }

  return error.code === '42P01' || error.code === '42703'
}

function mapStoredTeacherDashboardSummary(
  row: typeof teacherDashboardSummaries.$inferSelect
): StoredTeacherDashboardSummary {
  return {
    id: row.id,
    summaryDate: row.summaryDate,
    signature: row.signature,
    bullets: row.bulletsJson,
    neededCompetencyId: row.neededCompetencyId,
    neededCompetencyLabel: row.neededCompetencyLabel,
    source: row.source === 'ai' ? 'ai' : 'local',
    generatedAt: row.generatedAt
  }
}

export async function getTeacherDashboardSummary() {
  const db = getDb()

  const [summary] = await db
    .select()
    .from(teacherDashboardSummaries)
    .where(eq(teacherDashboardSummaries.id, TEACHER_DASHBOARD_SUMMARY_ID))
    .limit(1)

  return summary ? mapStoredTeacherDashboardSummary(summary) : null
}

export async function upsertTeacherDashboardSummary({
  summaryDate,
  signature,
  bullets,
  neededCompetencyId,
  neededCompetencyLabel,
  source
}: {
  summaryDate: string
  signature: string
  bullets: string[]
  neededCompetencyId: string
  neededCompetencyLabel: string
  source: 'ai' | 'local'
}) {
  const db = getDb()
  const now = new Date()

  const [summary] = await db
    .insert(teacherDashboardSummaries)
    .values({
      id: TEACHER_DASHBOARD_SUMMARY_ID,
      summaryDate,
      signature,
      bulletsJson: bullets,
      neededCompetencyId,
      neededCompetencyLabel,
      source,
      generatedAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: teacherDashboardSummaries.id,
      set: {
        summaryDate,
        signature,
        bulletsJson: bullets,
        neededCompetencyId,
        neededCompetencyLabel,
        source,
        generatedAt: now,
        updatedAt: now
      }
    })
    .returning()

  return mapStoredTeacherDashboardSummary(summary)
}
