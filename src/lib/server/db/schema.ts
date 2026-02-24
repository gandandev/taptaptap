import { boolean, date, jsonb, pgTable, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core'

import type { EmotionAnswer } from '$lib/shared/emotion-types'

export const students = pgTable(
  'students',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    code: varchar('code', { length: 2 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date())
  },
  (table) => [unique('students_code_unique').on(table.code)]
)

export const emotionEntries = pgTable(
  'emotion_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    entryDate: date('entry_date', { mode: 'string' }).notNull(),
    answersJson: jsonb('answers_json').$type<EmotionAnswer[]>().notNull(),
    moodPrimary: text('mood_primary').notNull(),
    badReasonSummary: text('bad_reason_summary'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date())
  },
  (table) => [unique('emotion_entries_student_date_unique').on(table.studentId, table.entryDate)]
)

export type StudentRow = typeof students.$inferSelect
export type NewStudentRow = typeof students.$inferInsert
export type EmotionEntryRow = typeof emotionEntries.$inferSelect
export type NewEmotionEntryRow = typeof emotionEntries.$inferInsert
