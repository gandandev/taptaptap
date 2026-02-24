import { fail, redirect } from '@sveltejs/kit'

import { findStudentByCode, isValidStudentCodeFormat } from '$lib/server/repositories/students'

import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ url }) => {
  const errorCode = url.searchParams.get('error')

  return {
    errorMessage: errorCode === 'student-not-found' ? '학생 코드를 다시 확인해 주세요.' : null
  }
}

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = await request.formData()
    const code = String(formData.get('code') ?? '').trim()

    if (!isValidStudentCodeFormat(code)) {
      return fail(400, {
        code,
        message: '6자리 숫자 학생 코드를 입력해 주세요.'
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
