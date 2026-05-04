import { error, fail, redirect } from '@sveltejs/kit'

import { TEACHER_SESSION_COOKIE, verifyTeacherSessionToken } from '$lib/server/auth/teacher-session'
import { listEmotionEntriesForStudent } from '$lib/server/repositories/emotion-entries'
import {
  deleteStudentById,
  findStudentById,
  resetStudentPinById
} from '$lib/server/repositories/students'
import { checkRateLimit } from '$lib/server/security/rate-limit'
import { getClientIp, isSameOriginMutationRequest } from '$lib/server/security/request'

import type { Actions, PageServerLoad } from './$types'

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
      code: student.code,
      hasPin: student.pinHash !== null,
      pinResetRequired: student.pinResetRequired
    },
    entries
  }
}

export const actions: Actions = {
  resetPin: async (event) => {
    if (!verifyTeacherSessionToken(event.cookies.get(TEACHER_SESSION_COOKIE))) {
      throw redirect(303, '/teacher/login')
    }

    if (!isSameOriginMutationRequest(event)) {
      return fail(403, {
        message: '허용되지 않은 요청이에요.'
      })
    }

    const ip = getClientIp(event)
    const rateLimit = checkRateLimit({
      bucket: 'teacher-reset-student-pin',
      key: ip,
      limit: 40,
      windowMs: 10 * 60 * 1000
    })

    if (!rateLimit.ok) {
      return fail(429, {
        message: `PIN 재설정 요청이 너무 많아요. ${rateLimit.retryAfterSec}초 후 다시 시도해 주세요.`
      })
    }

    const student = await findStudentById(event.params.studentId)

    if (!student || !student.isActive) {
      return fail(404, {
        message: '이미 삭제되었거나 없는 학생이에요.'
      })
    }

    const updatedStudent = await resetStudentPinById(student.id)

    if (!updatedStudent) {
      return fail(404, {
        message: '학생을 찾을 수 없어요.'
      })
    }

    return {
      message: '학생 PIN을 재설정했어요.'
    }
  },

  delete: async (event) => {
    if (!verifyTeacherSessionToken(event.cookies.get(TEACHER_SESSION_COOKIE))) {
      throw redirect(303, '/teacher/login')
    }

    if (!isSameOriginMutationRequest(event)) {
      return fail(403, {
        message: '허용되지 않은 요청이에요.'
      })
    }

    const ip = getClientIp(event)
    const rateLimit = checkRateLimit({
      bucket: 'teacher-delete-student',
      key: ip,
      limit: 20,
      windowMs: 10 * 60 * 1000
    })

    if (!rateLimit.ok) {
      return fail(429, {
        message: `학생 삭제 요청이 너무 많아요. ${rateLimit.retryAfterSec}초 후 다시 시도해 주세요.`
      })
    }

    const student = await findStudentById(event.params.studentId)

    if (!student || !student.isActive) {
      return fail(404, {
        message: '이미 삭제되었거나 없는 학생이에요.'
      })
    }

    const deletedStudent = await deleteStudentById(student.id)

    if (!deletedStudent) {
      return fail(404, {
        message: '학생을 찾을 수 없어요.'
      })
    }

    throw redirect(303, '/teacher')
  }
}
