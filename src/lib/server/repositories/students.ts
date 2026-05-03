import { and, eq } from 'drizzle-orm'
import { randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto'

import { getDb } from '$lib/server/db/client'
import { students } from '$lib/server/db/schema'

function generateStudentCode() {
  return String(randomInt(0, 100)).padStart(2, '0')
}

function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'
}

function normalizeStudentName(name: string) {
  return name.trim().replace(/\s+/g, ' ')
}

function hashStudentPin(pin: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(pin, salt, 32).toString('hex')

  return `scrypt:${salt}:${hash}`
}

export function isValidStudentPinFormat(pin: string) {
  return /^\d{4}$/.test(pin)
}

export function verifyStudentPin(pin: string, pinHash: string | null) {
  if (!isValidStudentPinFormat(pin) || !pinHash) {
    return false
  }

  const [algorithm, salt, expectedHash] = pinHash.split(':')

  if (algorithm !== 'scrypt' || !salt || !expectedHash) {
    return false
  }

  const actualBuffer = scryptSync(pin, salt, 32)
  const expectedBuffer = Buffer.from(expectedHash, 'hex')

  if (actualBuffer.length !== expectedBuffer.length) {
    return false
  }

  return timingSafeEqual(actualBuffer, expectedBuffer)
}

export function isValidStudentCodeFormat(code: string) {
  return /^\d{2}$/.test(code)
}

export function normalizeStudentBirthDate(input: string) {
  const digits = input.replace(/\D/g, '')

  if (digits.length !== 4) {
    return null
  }

  const month = Number(digits.slice(0, 2))
  const day = Number(digits.slice(2, 4))

  if (!Number.isInteger(month) || !Number.isInteger(day)) {
    return null
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null
  }

  const maxDaysByMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

  if (day > maxDaysByMonth[month - 1]) {
    return null
  }

  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function formatStudentBirthDate(birthDate: string | null) {
  if (!birthDate) return null

  const [month, day] = birthDate.split('-')
  if (!month || !day) return birthDate

  return `${Number(month)}월 ${Number(day)}일`
}

export async function findStudentByCode(code: string) {
  const db = getDb()

  const [student] = await db.select().from(students).where(eq(students.code, code)).limit(1)

  return student ?? null
}

export async function findStudentsByNameAndBirthDate(name: string, birthDate: string) {
  const db = getDb()
  const normalizedName = normalizeStudentName(name)

  return db
    .select()
    .from(students)
    .where(
      and(
        eq(students.name, normalizedName),
        eq(students.birthDate, birthDate),
        eq(students.isActive, true)
      )
    )
    .limit(2)
}

export async function findActiveStudentsByName(name: string) {
  const db = getDb()
  const normalizedName = normalizeStudentName(name)

  return db
    .select()
    .from(students)
    .where(and(eq(students.name, normalizedName), eq(students.isActive, true)))
    .limit(50)
}

export async function findStudentById(studentId: string) {
  const db = getDb()

  const [student] = await db.select().from(students).where(eq(students.id, studentId)).limit(1)

  return student ?? null
}

export async function deleteStudentById(studentId: string) {
  const db = getDb()

  const [deletedStudent] = await db.delete(students).where(eq(students.id, studentId)).returning()

  return deletedStudent ?? null
}

export async function updateStudentBirthDateById(studentId: string, birthDate: string) {
  const normalizedBirthDate = normalizeStudentBirthDate(birthDate)

  if (!normalizedBirthDate) {
    throw new Error('Student birth date is invalid')
  }

  const db = getDb()

  const [student] = await db
    .update(students)
    .set({
      birthDate: normalizedBirthDate
    })
    .where(eq(students.id, studentId))
    .returning()

  return student ?? null
}

export async function setStudentPinById(studentId: string, pin: string) {
  if (!isValidStudentPinFormat(pin)) {
    throw new Error('Student PIN is invalid')
  }

  const db = getDb()

  const [student] = await db
    .update(students)
    .set({
      pinHash: hashStudentPin(pin),
      pinResetRequired: false
    })
    .where(eq(students.id, studentId))
    .returning()

  return student ?? null
}

export async function resetStudentPinById(studentId: string) {
  const db = getDb()

  const [student] = await db
    .update(students)
    .set({
      pinHash: null,
      pinResetRequired: true
    })
    .where(eq(students.id, studentId))
    .returning()

  return student ?? null
}

export async function createStudentWithAutoCode(
  {
    name,
    birthDate
  }: {
    name: string
    birthDate: string
  },
  maxAttempts = 200
) {
  const trimmedName = normalizeStudentName(name)
  const normalizedBirthDate = normalizeStudentBirthDate(birthDate)

  if (!trimmedName) {
    throw new Error('Student name is required')
  }

  if (trimmedName.length > 40) {
    throw new Error('Student name is too long')
  }

  if (!normalizedBirthDate) {
    throw new Error('Student birth date is invalid')
  }

  const db = getDb()

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = generateStudentCode()

    try {
      const [student] = await db
        .insert(students)
        .values({
          name: trimmedName,
          code,
          birthDate: normalizedBirthDate
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
