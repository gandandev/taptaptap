import { redirect } from '@sveltejs/kit'

import { STUDENT_SESSION_COOKIE, verifyStudentSessionToken } from '$lib/server/auth/student-session'
import { generateEmotionReflection } from '$lib/server/ai/emotion-reflection'
import { getEmotionEntryForStudentToday } from '$lib/server/repositories/emotion-entries'
import { findStudentByCode, isValidStudentCodeFormat } from '$lib/server/repositories/students'
import { todayDateInKst } from '$lib/server/time'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ cookies, params }) => {
  const code = params.code.trim()

  if (!isValidStudentCodeFormat(code)) {
    throw redirect(303, '/?error=student-not-found')
  }

  const student = await findStudentByCode(code)

  if (!student || !student.isActive) {
    throw redirect(303, '/?error=student-not-found')
  }

  if (!verifyStudentSessionToken(cookies.get(STUDENT_SESSION_COOKIE), student.id, student.code)) {
    throw redirect(303, '/?error=session-required')
  }

  const savedEntry = await getEmotionEntryForStudentToday(student.id)
  const savedReflection = savedEntry ? await generateEmotionReflection(savedEntry.answers) : null

  return {
    student: {
      id: student.id,
      name: student.name,
      code: student.code
    },
    todayDate: todayDateInKst(),
    savedEntry,
    savedReflection
  }
}
