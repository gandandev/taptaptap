import { and, asc, desc, eq } from 'drizzle-orm'

import { getDb } from '$lib/server/db/client'
import { emotionEntries, students } from '$lib/server/db/schema'
import { todayDateInKst } from '$lib/server/time'
import { deriveEmotionEntryMetadata } from '$lib/shared/emotion-tree'
import type { EmotionAnswer, EmotionEntryRecord, TeacherStudentSummary } from '$lib/shared/emotion-types'

function mapEmotionEntryRecord(row: typeof emotionEntries.$inferSelect): EmotionEntryRecord {
  return {
    id: row.id,
    studentId: row.studentId,
    entryDate: row.entryDate,
    answers: row.answersJson,
    moodPrimary: row.moodPrimary,
    badReasonSummary: row.badReasonSummary,
    submittedAt: row.submittedAt,
    updatedAt: row.updatedAt
  }
}

export async function getEmotionEntryForStudentDate(studentId: string, entryDate: string) {
  const db = getDb()

  const [entry] = await db
    .select()
    .from(emotionEntries)
    .where(and(eq(emotionEntries.studentId, studentId), eq(emotionEntries.entryDate, entryDate)))
    .limit(1)

  return entry ? mapEmotionEntryRecord(entry) : null
}

export async function getEmotionEntryForStudentToday(studentId: string) {
  return getEmotionEntryForStudentDate(studentId, todayDateInKst())
}

export async function upsertEmotionEntryForStudentDate({
  studentId,
  entryDate,
  answers
}: {
  studentId: string
  entryDate: string
  answers: EmotionAnswer[]
}) {
  const db = getDb()
  const now = new Date()
  const { moodPrimary, badReasonSummary } = deriveEmotionEntryMetadata(answers)

  const [entry] = await db
    .insert(emotionEntries)
    .values({
      studentId,
      entryDate,
      answersJson: answers,
      moodPrimary,
      badReasonSummary,
      submittedAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: [emotionEntries.studentId, emotionEntries.entryDate],
      set: {
        answersJson: answers,
        moodPrimary,
        badReasonSummary,
        submittedAt: now,
        updatedAt: now
      }
    })
    .returning()

  return mapEmotionEntryRecord(entry)
}

export async function upsertEmotionEntryForStudentToday({
  studentId,
  answers
}: {
  studentId: string
  answers: EmotionAnswer[]
}) {
  return upsertEmotionEntryForStudentDate({
    studentId,
    entryDate: todayDateInKst(),
    answers
  })
}

export async function listTeacherStudentSummariesForDate(entryDate: string): Promise<TeacherStudentSummary[]> {
  const db = getDb()

  const rows = await db
    .select({
      studentId: students.id,
      name: students.name,
      code: students.code,
      entryId: emotionEntries.id,
      moodPrimary: emotionEntries.moodPrimary,
      badReasonSummary: emotionEntries.badReasonSummary,
      submittedAt: emotionEntries.submittedAt
    })
    .from(students)
    .leftJoin(
      emotionEntries,
      and(eq(emotionEntries.studentId, students.id), eq(emotionEntries.entryDate, entryDate))
    )
    .where(eq(students.isActive, true))
    .orderBy(asc(students.name))

  return rows.map((row) => ({
    studentId: row.studentId,
    name: row.name,
    code: row.code,
    hasSubmittedToday: row.entryId !== null,
    moodPrimary: row.moodPrimary,
    badReasonSummary: row.badReasonSummary,
    submittedAt: row.submittedAt
  }))
}

export async function listEmotionEntriesForStudent(studentId: string) {
  const db = getDb()

  const rows = await db
    .select()
    .from(emotionEntries)
    .where(eq(emotionEntries.studentId, studentId))
    .orderBy(desc(emotionEntries.entryDate), desc(emotionEntries.submittedAt))

  return rows.map(mapEmotionEntryRecord)
}
