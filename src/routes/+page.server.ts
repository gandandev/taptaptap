import { fail, redirect } from '@sveltejs/kit'

import { findStudentByCode, isValidStudentCodeFormat } from '$lib/server/repositories/students'
import { checkRateLimit } from '$lib/server/security/rate-limit'
import { getClientIp, isSameOriginMutationRequest } from '$lib/server/security/request'

import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ url }) => {
  const errorCode = url.searchParams.get('error')

  return {
    errorMessage: errorCode === 'student-not-found' ? '학생 코드를 다시 확인해 주세요.' : null
  }
}

export const actions: Actions = {
  default: async (event) => {
    if (!isSameOriginMutationRequest(event)) {
      return fail(403, {
        message: '허용되지 않은 요청이에요.'
      })
    }

    const ip = getClientIp(event)
    const rateLimit = checkRateLimit({
      bucket: 'student-code-lookup',
      key: ip,
      limit: 30,
      windowMs: 10 * 60 * 1000
    })

    if (!rateLimit.ok) {
      return fail(429, {
        message: `요청이 너무 많아요. ${rateLimit.retryAfterSec}초 후 다시 시도해 주세요.`
      })
    }

    const { request } = event
    const formData = await request.formData()
    const code = String(formData.get('code') ?? '').trim()

    if (!isValidStudentCodeFormat(code)) {
      return fail(400, {
        code,
        message: '2자리 숫자 학생 코드를 입력해 주세요.'
      })
    }

    const student = await findStudentByCode(code)

    if (!student || !student.isActive) {
      return fail(400, {
        code,
        message: '존재하지 않는 학생 코드예요.'
      })
    }

    throw redirect(303, `/student/${code}`)
  }
}
