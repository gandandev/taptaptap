import { fail, redirect } from '@sveltejs/kit'

import {
  buildTeacherDashboardSignature,
  generateTeacherDashboardSummary,
  getMostNeededCompetency,
  hasTeacherDashboardAiProvider,
  TeacherDashboardAiGenerationError
} from '$lib/server/ai/teacher-dashboard-summary'
import {
  getTeacherDashboardSummary,
  isTeacherDashboardSummaryStorageMissing,
  type StoredTeacherDashboardSummary,
  upsertTeacherDashboardSummary
} from '$lib/server/repositories/teacher-dashboard-summaries'
import {
  listClassEmotionEntriesSince,
  listTeacherStudentSummariesForDate
} from '$lib/server/repositories/emotion-entries'
import { TEACHER_SESSION_COOKIE, verifyTeacherSessionToken } from '$lib/server/auth/teacher-session'
import {
  createStudentsWithAutoCodes,
  findStudentById,
  resetStudentPinById
} from '$lib/server/repositories/students'
import { checkRateLimit } from '$lib/server/security/rate-limit'
import { getClientIp, isSameOriginMutationRequest } from '$lib/server/security/request'
import { todayDateInKst } from '$lib/server/time'
import {
  enrichStudentSummaries,
  findThreeDayRiskAlerts,
  getRecentDateStrings,
  SEL_COMPETENCIES,
  summarizeEmotionTrends,
  summarizeSelTrends
} from '$lib/shared/emotion-analysis'

import type { Actions, PageServerLoad } from './$types'

function toStoredAiSummary(summary: {
  bullets: string[]
  neededCompetency: { id: string; label: string }
  source: 'ai' | 'local'
}): StoredTeacherDashboardSummary {
  return {
    id: 'volatile-dashboard-summary',
    summaryDate: '',
    signature: '',
    bullets: summary.bullets,
    neededCompetencyId: summary.neededCompetency.id,
    neededCompetencyLabel: summary.neededCompetency.label,
    source: summary.source,
    generatedAt: new Date()
  }
}

async function persistTeacherDashboardSummary({
  todayDate,
  signature,
  summary,
  canPersist
}: {
  todayDate: string
  signature: string
  summary: {
    bullets: string[]
    neededCompetency: { id: string; label: string }
    source: 'ai' | 'local'
  }
  canPersist: boolean
}) {
  if (!canPersist) {
    return toStoredAiSummary(summary)
  }

  try {
    return await upsertTeacherDashboardSummary({
      summaryDate: todayDate,
      signature,
      bullets: summary.bullets,
      neededCompetencyId: summary.neededCompetency.id,
      neededCompetencyLabel: summary.neededCompetency.label,
      source: summary.source
    })
  } catch (error) {
    if (!isTeacherDashboardSummaryStorageMissing(error)) {
      throw error
    }

    return toStoredAiSummary(summary)
  }
}

function getDashboardLoadErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return '대시보드 데이터를 불러오지 못했어요. 서버 로그를 확인해 주세요.'
  }

  const code = 'code' in error && typeof error.code === 'string' ? error.code : undefined

  if (error.message === 'DATABASE_URL is required') {
    return 'DATABASE_URL이 설정되지 않았어요. .env 또는 배포 환경변수를 확인해 주세요.'
  }

  if (code === '28P01') {
    return '데이터베이스 로그인이 거부됐어요. DATABASE_URL의 사용자명과 비밀번호를 최신 값으로 바꿔 주세요.'
  }

  if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ETIMEDOUT') {
    return '데이터베이스 서버에 연결할 수 없어요. DATABASE_URL의 호스트/포트와 DB 실행 상태를 확인해 주세요.'
  }

  if (code === '42P01' || code === '42703') {
    return '데이터베이스 테이블 정보가 앱과 맞지 않아요. pnpm db:migrate를 실행해 주세요.'
  }

  return '대시보드 데이터를 불러오지 못했어요. 서버 로그를 확인해 주세요.'
}

function getAiSummaryGenerationErrorMessage(error: unknown) {
  if (error instanceof TeacherDashboardAiGenerationError) {
    return 'AI 학급 요약 생성이 실패했어요. OpenRouter 응답이나 모델 설정을 확인해 주세요.'
  }

  return null
}

const dashboardDatePattern = /^\d{4}-\d{2}-\d{2}$/

function isValidDashboardDate(date: string) {
  if (!dashboardDatePattern.test(date)) return false

  const parsedDate = new Date(`${date}T00:00:00.000Z`)

  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === date
}

function getSelectedDashboardDate(dateParam: string | null, todayDate: string) {
  if (!dateParam) return todayDate
  if (!isValidDashboardDate(dateParam)) return todayDate
  if (dateParam > todayDate) return todayDate

  return dateParam
}

export const load: PageServerLoad = async ({ url }) => {
  const todayDate = todayDateInKst()
  const selectedDate = getSelectedDashboardDate(url.searchParams.get('date'), todayDate)
  const recentStartDate = getRecentDateStrings(selectedDate, 30).at(-1) ?? selectedDate

  try {
    const [students, recentEntries] = await Promise.all([
      listTeacherStudentSummariesForDate(selectedDate),
      listClassEmotionEntriesSince(recentStartDate)
    ])
    const riskAlerts = findThreeDayRiskAlerts(recentEntries, selectedDate)
    const selTrends = summarizeSelTrends(recentEntries)
    const submittedTodayCount = students.filter((student) => student.hasSubmittedToday).length

    if (submittedTodayCount === 0) {
      return {
        todayDate,
        selectedDate,
        recentStartDate,
        students: enrichStudentSummaries(students),
        submittedTodayCount,
        aiSummary: null,
        emotionTrends: summarizeEmotionTrends(recentEntries).slice(0, 6),
        selTrends,
        dashboardError: null
      }
    }

    const summarySignature = buildTeacherDashboardSignature({ todayDate: selectedDate, students })
    let cachedAiSummary: StoredTeacherDashboardSummary | null = null

    try {
      cachedAiSummary = await getTeacherDashboardSummary(selectedDate)
    } catch (error) {
      if (!isTeacherDashboardSummaryStorageMissing(error)) {
        throw error
      }
    }

    const fallbackNeededCompetency = getMostNeededCompetency(recentEntries, riskAlerts)
    const canReuseCachedSummary =
      cachedAiSummary?.signature === summarySignature &&
      (cachedAiSummary.source === 'ai' || !hasTeacherDashboardAiProvider())
    let storedAiSummary: StoredTeacherDashboardSummary | null =
      cachedAiSummary && canReuseCachedSummary ? cachedAiSummary : null
    let aiSummaryError: string | null = null

    if (!storedAiSummary) {
      try {
        storedAiSummary = await persistTeacherDashboardSummary({
          todayDate: selectedDate,
          signature: summarySignature,
          summary: await generateTeacherDashboardSummary({
            todayDate: selectedDate,
            todayStudents: students,
            recentEntries,
            riskAlerts,
            selTrends
          }),
          canPersist: true
        })
      } catch (error) {
        aiSummaryError = getAiSummaryGenerationErrorMessage(error)

        if (!aiSummaryError) {
          throw error
        }
      }
    }

    const aiSummary = storedAiSummary
      ? {
          bullets: storedAiSummary.bullets,
          neededCompetency:
            SEL_COMPETENCIES[storedAiSummary.neededCompetencyId as keyof typeof SEL_COMPETENCIES] ??
            fallbackNeededCompetency,
          source: storedAiSummary.source,
          generatedAt: storedAiSummary.generatedAt
        }
      : null

    return {
      todayDate,
      selectedDate,
      recentStartDate,
      students: enrichStudentSummaries(students),
      submittedTodayCount,
      aiSummary,
      emotionTrends: summarizeEmotionTrends(recentEntries).slice(0, 6),
      selTrends,
      dashboardError: aiSummaryError
    }
  } catch (error) {
    console.error('Failed to load teacher dashboard', error)

    return {
      todayDate,
      selectedDate,
      recentStartDate,
      students: [],
      submittedTodayCount: 0,
      aiSummary: null,
      emotionTrends: [],
      selTrends: [],
      dashboardError: getDashboardLoadErrorMessage(error)
    }
  }
}

export const actions: Actions = {
  createStudents: async (event) => {
    if (!verifyTeacherSessionToken(event.cookies.get(TEACHER_SESSION_COOKIE))) {
      throw redirect(303, '/teacher/login')
    }

    if (!isSameOriginMutationRequest(event)) {
      return fail(403, {
        action: 'createStudents',
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
        action: 'createStudents',
        message: `학생 추가 요청이 너무 많아요. ${rateLimit.retryAfterSec}초 후 다시 시도해 주세요.`
      })
    }

    const { request } = event
    const formData = await request.formData()
    const names = String(formData.get('names') ?? '')
      .split(/\r?\n/)
      .map((name) => name.trim().replace(/\s+/g, ' '))
      .filter(Boolean)

    if (names.length === 0) {
      return fail(400, {
        action: 'createStudents',
        message: '학생 이름을 한 줄에 한 명씩 입력해 주세요.'
      })
    }

    if (names.length > 50) {
      return fail(400, {
        action: 'createStudents',
        message: '학생은 한 번에 최대 50명까지 추가할 수 있어요.'
      })
    }

    const duplicateName = names.find((name, index) => names.indexOf(name) !== index)

    if (duplicateName) {
      return fail(400, {
        action: 'createStudents',
        message: `${duplicateName} 학생 이름이 중복돼요. 이름 뒤에 1 또는 2를 붙여 구분해 주세요.`
      })
    }

    const longName = names.find((name) => name.length > 40)

    if (longName) {
      return fail(400, {
        action: 'createStudents',
        message: `학생 이름은 40자 이하로 입력해 주세요. (${longName})`
      })
    }

    try {
      const createdStudents = await createStudentsWithAutoCodes(names)

      return {
        action: 'createStudents',
        message:
          createdStudents.length === 1
            ? `${createdStudents[0].name} 학생을 추가했어요.`
            : `${createdStudents.length}명의 학생을 추가했어요.`,
        createdStudents: createdStudents.map((student) => ({
          id: student.id,
          name: student.name,
          code: student.code
        }))
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Student name is too long') {
        return fail(400, {
          action: 'createStudents',
          message: '학생 이름은 40자 이하로 입력해 주세요.'
        })
      }

      if (error instanceof Error && error.message === 'Student name already exists') {
        return fail(400, {
          action: 'createStudents',
          message: '이미 등록된 학생 이름이에요. 이름 뒤에 1 또는 2를 붙여 구분해 주세요.'
        })
      }

      return fail(500, {
        action: 'createStudents',
        message: '학생 추가 중 오류가 발생했어요.'
      })
    }
  },

  regenerateSummary: async (event) => {
    if (!verifyTeacherSessionToken(event.cookies.get(TEACHER_SESSION_COOKIE))) {
      throw redirect(303, '/teacher/login')
    }

    if (!isSameOriginMutationRequest(event)) {
      return fail(403, {
        action: 'regenerateSummary',
        message: '허용되지 않은 요청이에요.'
      })
    }

    const ip = getClientIp(event)
    const rateLimit = checkRateLimit({
      bucket: 'teacher-regenerate-dashboard-summary',
      key: ip,
      limit: 10,
      windowMs: 10 * 60 * 1000
    })

    if (!rateLimit.ok) {
      return fail(429, {
        action: 'regenerateSummary',
        message: `요약 재생성 요청이 너무 많아요. ${rateLimit.retryAfterSec}초 후 다시 시도해 주세요.`
      })
    }

    const todayDate = todayDateInKst()
    const formData = await event.request.formData()
    const selectedDate = getSelectedDashboardDate(String(formData.get('date') ?? ''), todayDate)
    const recentStartDate = getRecentDateStrings(selectedDate, 30).at(-1) ?? selectedDate

    try {
      const students = await listTeacherStudentSummariesForDate(selectedDate)
      const submittedTodayCount = students.filter((student) => student.hasSubmittedToday).length

      if (submittedTodayCount === 0) {
        return {
          action: 'regenerateSummary',
          message: '선택한 날짜에 제출한 학생이 없어 요약을 생성하지 않았어요.'
        }
      }

      const recentEntries = await listClassEmotionEntriesSince(recentStartDate)
      const riskAlerts = findThreeDayRiskAlerts(recentEntries, selectedDate)
      const selTrends = summarizeSelTrends(recentEntries)
      const summarySignature = buildTeacherDashboardSignature({ todayDate: selectedDate, students })
      const summary = await generateTeacherDashboardSummary({
        todayDate: selectedDate,
        todayStudents: students,
        recentEntries,
        riskAlerts,
        selTrends
      })

      await persistTeacherDashboardSummary({
        todayDate: selectedDate,
        signature: summarySignature,
        summary,
        canPersist: true
      })

      return {
        action: 'regenerateSummary'
      }
    } catch (error) {
      if (isTeacherDashboardSummaryStorageMissing(error)) {
        return {
          action: 'regenerateSummary',
          message: 'AI 학급 요약을 다시 생성했지만 캐시 테이블이 없어 저장하지 못했어요.'
        }
      }

      const aiSummaryError = getAiSummaryGenerationErrorMessage(error)

      if (aiSummaryError) {
        console.error('Failed to regenerate teacher dashboard AI summary', error)

        return fail(502, {
          action: 'regenerateSummary',
          message: aiSummaryError
        })
      }

      console.error('Failed to regenerate teacher dashboard summary', error)

      return fail(500, {
        action: 'regenerateSummary',
        message: getDashboardLoadErrorMessage(error)
      })
    }
  },

  resetPin: async (event) => {
    if (!verifyTeacherSessionToken(event.cookies.get(TEACHER_SESSION_COOKIE))) {
      throw redirect(303, '/teacher/login')
    }

    if (!isSameOriginMutationRequest(event)) {
      return fail(403, {
        action: 'resetPin',
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
        action: 'resetPin',
        message: `비밀번호 재설정 요청이 너무 많아요. ${rateLimit.retryAfterSec}초 후 다시 시도해 주세요.`
      })
    }

    const formData = await event.request.formData()
    const studentId = String(formData.get('studentId') ?? '').trim()
    const student = await findStudentById(studentId)

    if (!student || !student.isActive) {
      return fail(404, {
        action: 'resetPin',
        message: '이미 삭제되었거나 없는 학생이에요.'
      })
    }

    const updatedStudent = await resetStudentPinById(student.id)

    if (!updatedStudent) {
      return fail(404, {
        action: 'resetPin',
        message: '학생을 찾을 수 없어요.'
      })
    }

    return {
      action: 'resetPin',
      message: '학생 비밀번호를 재설정했어요.'
    }
  }
}
