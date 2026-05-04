import { and, asc, desc, eq, gte } from 'drizzle-orm'

import { getDb } from '$lib/server/db/client'
import { emotionEntries, students } from '$lib/server/db/schema'
import { todayDateInKst } from '$lib/server/time'
import { deriveEmotionEntryMetadata } from '$lib/shared/emotion-tree'
import type {
  EmotionAnswer,
  EmotionEntryRecord,
  EmotionReflection,
  TeacherClassEntry,
  TeacherStudentSummary
} from '$lib/shared/emotion-types'

function parseReflectionSource(source: string | null): EmotionReflection['source'] | null {
  if (source === 'ai' || source === 'local') {
    return source
  }

  return null
}

function mapEmotionEntryRecord(row: typeof emotionEntries.$inferSelect): EmotionEntryRecord {
  return {
    id: row.id,
    studentId: row.studentId,
    entryDate: row.entryDate,
    answers: row.answersJson,
    moodPrimary: row.moodPrimary,
    badReasonSummary: row.badReasonSummary,
    reflectionSummary: row.reflectionSummary,
    reflectionAdvice: row.reflectionAdvice,
    reflectionSource: parseReflectionSource(row.reflectionSource),
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

export async function updateEmotionEntryReflection({
  entryId,
  reflection
}: {
  entryId: string
  reflection: EmotionReflection
}) {
  const db = getDb()

  await db
    .update(emotionEntries)
    .set({
      reflectionSummary: reflection.summary,
      reflectionAdvice: reflection.advice,
      reflectionSource: reflection.source,
      updatedAt: new Date()
    })
    .where(eq(emotionEntries.id, entryId))
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

export async function listTeacherStudentSummariesForDate(
  entryDate: string
): Promise<TeacherStudentSummary[]> {
  const db = getDb()

  const rows = await db
    .select({
      studentId: students.id,
      name: students.name,
      code: students.code,
      pinHash: students.pinHash,
      pinResetRequired: students.pinResetRequired,
      entryId: emotionEntries.id,
      answers: emotionEntries.answersJson,
      moodPrimary: emotionEntries.moodPrimary,
      badReasonSummary: emotionEntries.badReasonSummary,
      reflectionSummary: emotionEntries.reflectionSummary,
      reflectionAdvice: emotionEntries.reflectionAdvice,
      reflectionSource: emotionEntries.reflectionSource,
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
    hasPin: row.pinHash !== null,
    pinResetRequired: row.pinResetRequired,
    hasSubmittedToday: row.entryId !== null,
    answers: row.answers,
    moodPrimary: row.moodPrimary,
    badReasonSummary: row.badReasonSummary,
    reflectionSummary: row.reflectionSummary,
    reflectionAdvice: row.reflectionAdvice,
    reflectionSource: parseReflectionSource(row.reflectionSource),
    submittedAt: row.submittedAt
  }))
}

export async function listClassEmotionEntriesSince(
  entryDate: string
): Promise<TeacherClassEntry[]> {
  const db = getDb()

  const rows = await db
    .select({
      id: emotionEntries.id,
      studentId: emotionEntries.studentId,
      studentName: students.name,
      studentCode: students.code,
      entryDate: emotionEntries.entryDate,
      answersJson: emotionEntries.answersJson,
      moodPrimary: emotionEntries.moodPrimary,
      badReasonSummary: emotionEntries.badReasonSummary,
      reflectionSummary: emotionEntries.reflectionSummary,
      reflectionAdvice: emotionEntries.reflectionAdvice,
      reflectionSource: emotionEntries.reflectionSource,
      submittedAt: emotionEntries.submittedAt,
      updatedAt: emotionEntries.updatedAt
    })
    .from(emotionEntries)
    .innerJoin(students, eq(students.id, emotionEntries.studentId))
    .where(and(eq(students.isActive, true), gte(emotionEntries.entryDate, entryDate)))
    .orderBy(desc(emotionEntries.entryDate), asc(students.name))

  return rows.map((row) => ({
    id: row.id,
    studentId: row.studentId,
    studentName: row.studentName,
    studentCode: row.studentCode,
    entryDate: row.entryDate,
    answers: row.answersJson,
    moodPrimary: row.moodPrimary,
    badReasonSummary: row.badReasonSummary,
    reflectionSummary: row.reflectionSummary,
    reflectionAdvice: row.reflectionAdvice,
    reflectionSource: parseReflectionSource(row.reflectionSource),
    submittedAt: row.submittedAt,
    updatedAt: row.updatedAt
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
