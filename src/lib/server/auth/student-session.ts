import { dev } from '$app/environment'
import { env } from '$env/dynamic/private'
import type { Cookies } from '@sveltejs/kit'
import { createHmac, timingSafeEqual } from 'node:crypto'

export const STUDENT_SESSION_COOKIE = 'student_session'

function requireSessionSecret() {
  const secret = env.TEACHER_SESSION_SECRET

  if (!secret) {
    throw new Error('TEACHER_SESSION_SECRET is required')
  }

  return secret
}

function signPayload(payload: string) {
  return createHmac('sha256', requireSessionSecret()).update(payload).digest('hex')
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a)
  const bBuffer = Buffer.from(b)

  if (aBuffer.length !== bBuffer.length) {
    return false
  }

  return timingSafeEqual(aBuffer, bBuffer)
}

export function createStudentSessionToken(studentId: string, code: string) {
  const payload = `student:${studentId}:${code}`
  const signature = signPayload(payload)

  return `${payload}.${signature}`
}

export function verifyStudentSessionToken(
  token: string | undefined | null,
  studentId: string,
  code: string
) {
  if (!token) return false

  const lastDot = token.lastIndexOf('.')

  if (lastDot <= 0) {
    return false
  }

  const payload = token.slice(0, lastDot)
  const signature = token.slice(lastDot + 1)
  const expectedPayload = `student:${studentId}:${code}`

  if (payload !== expectedPayload) {
    return false
  }

  return safeEqual(signature, signPayload(payload))
}

export function setStudentSessionCookie(cookies: Cookies, studentId: string, code: string) {
  cookies.set(STUDENT_SESSION_COOKIE, createStudentSessionToken(studentId, code), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: !dev,
    maxAge: 60 * 60 * 24 * 7
  })
}

export function clearStudentSessionCookie(cookies: Cookies) {
  cookies.delete(STUDENT_SESSION_COOKIE, {
    path: '/'
  })
}
