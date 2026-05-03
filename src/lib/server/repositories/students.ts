import { and, eq, inArray } from 'drizzle-orm'
import { randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto'

import { getDb } from '$lib/server/db/client'
import { students } from '$lib/server/db/schema'

function getUniqueViolationConstraint(error: unknown) {
  if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== '23505') {
    return null
  }

  return 'constraint' in error && typeof error.constraint === 'string' ? error.constraint : null
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

export async function findStudentByCode(code: string) {
  const db = getDb()

  const [student] = await db.select().from(students).where(eq(students.code, code)).limit(1)

  return student ?? null
}

export async function findActiveStudentsByName(name: string) {
  const db = getDb()
  const normalizedName = normalizeStudentName(name)

  return db
    .select()
    .from(students)
    .where(and(eq(students.name, normalizedName), eq(students.isActive, true)))
    .limit(2)
}

export async function findExistingStudentNames(names: string[]) {
  const db = getDb()
  const normalizedNames = [...new Set(names.map(normalizeStudentName).filter(Boolean))]

  if (normalizedNames.length === 0) {
    return []
  }

  const existingStudents = await db
    .select({ name: students.name })
    .from(students)
    .where(inArray(students.name, normalizedNames))

  return existingStudents.map((student) => student.name)
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

export async function createStudentWithAutoCode({ name }: { name: string }, maxAttempts = 200) {
  const [student] = await createStudentsWithAutoCodes([name], maxAttempts)

  if (!student) {
    throw new Error('Failed to generate a unique student code')
  }

  return student
}

function normalizeStudentNames(names: string[]) {
  const normalizedNames = names.map(normalizeStudentName)

  if (normalizedNames.some((name) => !name)) {
    throw new Error('Student name is required')
  }

  if (normalizedNames.some((name) => name.length > 40)) {
    throw new Error('Student name is too long')
  }

  if (new Set(normalizedNames).size !== normalizedNames.length) {
    throw new Error('Student name already exists')
  }

  return normalizedNames
}

function getAvailableStudentCodes(existingCodes: Set<string>) {
  return Array.from({ length: 100 }, (_, code) => String(code).padStart(2, '0')).filter(
    (code) => !existingCodes.has(code)
  )
}

function pickStudentCodes(count: number, availableCodes: string[]) {
  const codes = [...availableCodes]
  const pickedCodes: string[] = []

  for (let index = 0; index < count; index += 1) {
    const codeIndex = randomInt(0, codes.length)
    const [code] = codes.splice(codeIndex, 1)

    if (!code) {
      throw new Error('Failed to generate a unique student code')
    }

    pickedCodes.push(code)
  }

  return pickedCodes
}

export async function createStudentsWithAutoCodes(names: string[], maxAttempts = 20) {
  const normalizedNames = normalizeStudentNames(names)

  if (normalizedNames.length === 0) {
    return []
  }

  const db = getDb()
  const existingStudents = await db
    .select({ name: students.name })
    .from(students)
    .where(inArray(students.name, normalizedNames))

  if (existingStudents.length > 0) {
    throw new Error('Student name already exists')
  }

  const existingCodes = new Set(
    (await db.select({ code: students.code }).from(students)).map((student) => student.code)
  )

  if (existingCodes.size + normalizedNames.length > 100) {
    throw new Error('Failed to generate a unique student code')
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const availableCodes = getAvailableStudentCodes(existingCodes)
    const codes = pickStudentCodes(normalizedNames.length, availableCodes)

    try {
      return await db
        .insert(students)
        .values(normalizedNames.map((name, index) => ({ name, code: codes[index] })))
        .returning()
    } catch (error) {
      const uniqueConstraint = getUniqueViolationConstraint(error)

      if (uniqueConstraint === 'students_code_unique') {
        for (const code of codes) {
          existingCodes.add(code)
        }

        continue
      }

      if (uniqueConstraint === 'students_name_unique') {
        throw new Error('Student name already exists')
      }

      throw error
    }
  }

  throw new Error('Failed to generate a unique student code')
}
