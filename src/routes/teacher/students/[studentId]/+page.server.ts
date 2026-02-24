import { error } from '@sveltejs/kit'

import { listEmotionEntriesForStudent } from '$lib/server/repositories/emotion-entries'
import { findStudentById } from '$lib/server/repositories/students'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
  const student = await findStudentById(params.studentId)

  if (!student || !student.isActive) {
    throw error(404, '학생을 찾을 수 없어요.')
  }

  const entries = await listEmotionEntriesForStudent(student.id)

  return {
    student: {
      id: student.id,
      name: student.name,
      code: student.code
    },
    entries
  }
}
