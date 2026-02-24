import { eq } from 'drizzle-orm'
import { randomInt } from 'node:crypto'

import { getDb } from '$lib/server/db/client'
import { students } from '$lib/server/db/schema'

function generateStudentCode() {
  return String(randomInt(0, 100)).padStart(2, '0')
}

function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'
}

export function isValidStudentCodeFormat(code: string) {
  return /^\d{2}$/.test(code)
}

export async function findStudentByCode(code: string) {
  const db = getDb()

  const [student] = await db.select().from(students).where(eq(students.code, code)).limit(1)

  return student ?? null
}

export async function findStudentById(studentId: string) {
  const db = getDb()

  const [student] = await db.select().from(students).where(eq(students.id, studentId)).limit(1)

  return student ?? null
}

export async function createStudentWithAutoCode(name: string, maxAttempts = 200) {
  const trimmedName = name.trim().replace(/\s+/g, ' ')

  if (!trimmedName) {
    throw new Error('Student name is required')
  }

  if (trimmedName.length > 40) {
    throw new Error('Student name is too long')
  }

  const db = getDb()

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = generateStudentCode()

    try {
      const [student] = await db
        .insert(students)
        .values({
          name: trimmedName,
          code
        })
        .returning()

      return student
    } catch (error) {
      if (isUniqueViolation(error)) {
        continue
      }

      throw error
    }
  }

  throw new Error('Failed to generate a unique student code')
}
