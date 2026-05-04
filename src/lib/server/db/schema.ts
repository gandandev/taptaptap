import {
  boolean,
  date,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'

import type { EmotionAnswer } from '$lib/shared/emotion-types'

export const students = pgTable(
  'students',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    code: varchar('code', { length: 2 }).notNull(),
    pinHash: text('pin_hash'),
    pinResetRequired: boolean('pin_reset_required').notNull().default(true),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date())
  },
  (table) => [
    index('students_active_name_idx').on(table.isActive, table.name),
    unique('students_code_unique').on(table.code),
    unique('students_name_unique').on(table.name)
  ]
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
    reflectionSummary: text('reflection_summary'),
    reflectionAdvice: text('reflection_advice'),
    reflectionSource: text('reflection_source'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date())
  },
  (table) => [
    index('emotion_entries_entry_date_student_idx').on(table.entryDate, table.studentId),
    unique('emotion_entries_student_date_unique').on(table.studentId, table.entryDate)
  ]
)

export const teacherDashboardSummaries = pgTable('teacher_dashboard_summaries', {
  id: text('id').primaryKey(),
  summaryDate: date('summary_date', { mode: 'string' }).notNull(),
  signature: text('signature').notNull(),
  bulletsJson: jsonb('bullets_json').$type<string[]>().notNull(),
  neededCompetencyId: text('needed_competency_id').notNull(),
  neededCompetencyLabel: text('needed_competency_label').notNull(),
  source: text('source').notNull().default('local'),
  generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date())
})

export type StudentRow = typeof students.$inferSelect
export type NewStudentRow = typeof students.$inferInsert
export type EmotionEntryRow = typeof emotionEntries.$inferSelect
export type NewEmotionEntryRow = typeof emotionEntries.$inferInsert
export type TeacherDashboardSummaryRow = typeof teacherDashboardSummaries.$inferSelect
export type NewTeacherDashboardSummaryRow = typeof teacherDashboardSummaries.$inferInsert
