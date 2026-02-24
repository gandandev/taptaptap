import { redirect } from '@sveltejs/kit'

import { clearTeacherSessionCookie } from '$lib/server/auth/teacher-session'
import { isSameOriginMutationRequest } from '$lib/server/security/request'

import type { RequestHandler } from './$types'

export const POST: RequestHandler = async (event) => {
  if (!isSameOriginMutationRequest(event)) {
    return new Response('Forbidden', { status: 403 })
  }

  const { cookies } = event
  clearTeacherSessionCookie(cookies)
  throw redirect(303, '/teacher/login')
}
