import { fail } from '@sveltejs/kit'

import {
  listClassEmotionEntriesSince,
  listTeacherStudentSummariesForDate
} from '$lib/server/repositories/emotion-entries'
import {
  createStudentWithAutoCode,
  normalizeStudentBirthDate
} from '$lib/server/repositories/students'
import { checkRateLimit } from '$lib/server/security/rate-limit'
import { getClientIp, isSameOriginMutationRequest } from '$lib/server/security/request'
import { todayDateInKst } from '$lib/server/time'
import {
  enrichStudentSummaries,
  findThreeDayRiskAlerts,
  getRecentDateStrings,
  summarizeEmotionTrends,
  summarizeSelTrends
} from '$lib/shared/emotion-analysis'

import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
  const todayDate = todayDateInKst()
  const students = await listTeacherStudentSummariesForDate(todayDate)
  const recentStartDate = getRecentDateStrings(todayDate, 30).at(-1) ?? todayDate
  const recentEntries = await listClassEmotionEntriesSince(recentStartDate)

  return {
    todayDate,
    students: enrichStudentSummaries(students),
    riskAlerts: findThreeDayRiskAlerts(recentEntries, todayDate),
    emotionTrends: summarizeEmotionTrends(recentEntries).slice(0, 6),
    selTrends: summarizeSelTrends(recentEntries)
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
      bucket: 'teacher-create-student',
      key: ip,
      limit: 20,
      windowMs: 10 * 60 * 1000
    })

    if (!rateLimit.ok) {
      return fail(429, {
        message: `학생 추가 요청이 너무 많아요. ${rateLimit.retryAfterSec}초 후 다시 시도해 주세요.`
      })
    }

    const { request } = event
    const formData = await request.formData()
    const name = String(formData.get('name') ?? '').trim()
    const birthDateInput = String(formData.get('birthDate') ?? '').trim()
    const birthDate = normalizeStudentBirthDate(birthDateInput)

    if (!name) {
      return fail(400, {
        birthDate: birthDateInput,
        message: '학생 이름을 입력해 주세요.'
      })
    }

    if (!birthDate) {
      return fail(400, {
        message: '학생 생일을 월일 4자리로 입력해 주세요. 예: 0503'
      })
    }

    try {
      const student = await createStudentWithAutoCode({ name, birthDate })

      return {
        message: `${student.name} 학생을 추가했어요. 생일: ${birthDate}`,
        createdStudent: {
          id: student.id,
          name: student.name,
          code: student.code,
          birthDate: student.birthDate
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Student name is too long') {
        return fail(400, {
          message: '학생 이름은 40자 이하로 입력해 주세요.'
        })
      }

      if (error instanceof Error && error.message === 'Student birth date is invalid') {
        return fail(400, {
          message: '학생 생일을 월일 4자리로 입력해 주세요. 예: 0503'
        })
      }

      return fail(500, {
        message: '학생 추가 중 오류가 발생했어요.'
      })
    }
  }
}
