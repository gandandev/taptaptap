import { fail, redirect } from '@sveltejs/kit'

import { isTeacherPasswordValid, setTeacherSessionCookie } from '$lib/server/auth/teacher-session'
import { checkRateLimit } from '$lib/server/security/rate-limit'
import { getClientIp, isSameOriginMutationRequest } from '$lib/server/security/request'

import type { Actions } from './$types'

export const actions: Actions = {
  default: async (event) => {
    if (!isSameOriginMutationRequest(event)) {
      return fail(403, {
        message: '허용되지 않은 요청이에요.'
      })
    }

    const ip = getClientIp(event)
    const rateLimit = checkRateLimit({
      bucket: 'teacher-login',
      key: ip,
      limit: 8,
      windowMs: 10 * 60 * 1000
    })

    if (!rateLimit.ok) {
      return fail(429, {
        message: `로그인 시도가 너무 많아요. ${rateLimit.retryAfterSec}초 후 다시 시도해 주세요.`
      })
    }

    const { request, cookies } = event
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
