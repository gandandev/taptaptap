import { redirect } from '@sveltejs/kit'

import { TEACHER_SESSION_COOKIE, verifyTeacherSessionToken } from '$lib/server/auth/teacher-session'

import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ cookies, url }) => {
  const isLoginPage = url.pathname === '/teacher/login'
  const isAuthenticated = verifyTeacherSessionToken(cookies.get(TEACHER_SESSION_COOKIE))

  if (!isAuthenticated && !isLoginPage) {
    throw redirect(303, '/teacher/login')
  }

  if (isAuthenticated && isLoginPage) {
    throw redirect(303, '/teacher')
  }

  return {
    isAuthenticated,
    isLoginPage
  }
}
