import { redirect } from '@sveltejs/kit'

import { getEmotionEntryForStudentToday } from '$lib/server/repositories/emotion-entries'
import { findStudentByCode, isValidStudentCodeFormat } from '$lib/server/repositories/students'
import { todayDateInKst } from '$lib/server/time'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
  const code = params.code.trim()

  if (!isValidStudentCodeFormat(code)) {
    throw redirect(303, '/?error=student-not-found')
  }

  const student = await findStudentByCode(code)

  if (!student || !student.isActive) {
    throw redirect(303, '/?error=student-not-found')
  }

  const savedEntry = await getEmotionEntryForStudentToday(student.id)

  return {
    student: {
      id: student.id,
      name: student.name,
      code: student.code
    },
    todayDate: todayDateInKst(),
    savedEntry
  }
}
