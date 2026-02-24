import { dev } from '$app/environment'
import { env } from '$env/dynamic/private'
import type { Cookies } from '@sveltejs/kit'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

export const TEACHER_SESSION_COOKIE = 'teacher_session'

function requireTeacherPassword() {
  const password = env.TEACHER_DASHBOARD_PASSWORD

  if (!password) {
    throw new Error('TEACHER_DASHBOARD_PASSWORD is required')
  }

  return password
}

function requireTeacherSessionSecret() {
  const secret = env.TEACHER_SESSION_SECRET

  if (!secret) {
    throw new Error('TEACHER_SESSION_SECRET is required')
  }

  return secret
}

function sha256Hex(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function signPayload(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

function safeEqualHex(a: string, b: string) {
  const aBuffer = Buffer.from(a)
  const bBuffer = Buffer.from(b)

  if (aBuffer.length !== bBuffer.length) {
    return false
  }

  return timingSafeEqual(aBuffer, bBuffer)
}

export function isTeacherPasswordValid(inputPassword: string) {
  const expectedHash = sha256Hex(requireTeacherPassword())
  const inputHash = sha256Hex(inputPassword)

  return safeEqualHex(inputHash, expectedHash)
}

export function createTeacherSessionToken() {
  const passwordHash = sha256Hex(requireTeacherPassword())
  const payload = `teacher:${passwordHash}`
  const signature = signPayload(payload, requireTeacherSessionSecret())

  return `${payload}.${signature}`
}

export function verifyTeacherSessionToken(token: string | undefined | null) {
  if (!token) {
    return false
  }

  const lastDot = token.lastIndexOf('.')

  if (lastDot <= 0) {
    return false
  }

  const payload = token.slice(0, lastDot)
  const signature = token.slice(lastDot + 1)
  const expectedSignature = signPayload(payload, requireTeacherSessionSecret())

  if (!safeEqualHex(signature, expectedSignature)) {
    return false
  }

  const expectedPayload = `teacher:${sha256Hex(requireTeacherPassword())}`

  return payload === expectedPayload
}

export function setTeacherSessionCookie(cookies: Cookies) {
  cookies.set(TEACHER_SESSION_COOKIE, createTeacherSessionToken(), {
    path: '/teacher',
    httpOnly: true,
    sameSite: 'lax',
    secure: !dev,
    maxAge: 60 * 60 * 24 * 14
  })
}

export function clearTeacherSessionCookie(cookies: Cookies) {
  cookies.delete(TEACHER_SESSION_COOKIE, {
    path: '/teacher'
  })
}
