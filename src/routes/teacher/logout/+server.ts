import { redirect } from '@sveltejs/kit'

import { clearTeacherSessionCookie } from '$lib/server/auth/teacher-session'

import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ cookies }) => {
  clearTeacherSessionCookie(cookies)
  throw redirect(303, '/teacher/login')
}
