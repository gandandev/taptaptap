import { fail, redirect } from '@sveltejs/kit'

import { isTeacherPasswordValid, setTeacherSessionCookie } from '$lib/server/auth/teacher-session'

import type { Actions } from './$types'

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const formData = await request.formData()
    const password = String(formData.get('password') ?? '')

    if (!password) {
      return fail(400, {
        message: '비밀번호를 입력해 주세요.'
      })
    }

    if (!isTeacherPasswordValid(password)) {
      return fail(401, {
        message: '비밀번호가 올바르지 않아요.'
      })
    }

    setTeacherSessionCookie(cookies)
    throw redirect(303, '/teacher')
  }
}
