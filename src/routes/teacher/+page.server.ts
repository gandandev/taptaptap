import { fail } from '@sveltejs/kit'

import { listTeacherStudentSummariesForDate } from '$lib/server/repositories/emotion-entries'
import { createStudentWithAutoCode } from '$lib/server/repositories/students'
import { todayDateInKst } from '$lib/server/time'

import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
  const todayDate = todayDateInKst()
  const students = await listTeacherStudentSummariesForDate(todayDate)

  return {
    todayDate,
    students
  }
}

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = await request.formData()
    const name = String(formData.get('name') ?? '').trim()

    if (!name) {
      return fail(400, {
        message: '학생 이름을 입력해 주세요.'
      })
    }

    try {
      const student = await createStudentWithAutoCode(name)

      return {
        message: `${student.name} 학생을 추가했어요. 코드: ${student.code}`,
        createdStudent: {
          id: student.id,
          name: student.name,
          code: student.code
        }
      }
    } catch {
      return fail(500, {
        message: '학생 추가 중 오류가 발생했어요.'
      })
    }
  }
}
