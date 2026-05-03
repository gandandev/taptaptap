import { fail, redirect } from '@sveltejs/kit'
import type { RequestEvent } from '@sveltejs/kit'

import { setStudentSessionCookie } from '$lib/server/auth/student-session'
import {
  findActiveStudentsByName,
  isValidStudentPinFormat,
  setStudentPinById,
  verifyStudentPin
} from '$lib/server/repositories/students'
import { checkRateLimit, formatRetryAfterDuration } from '$lib/server/security/rate-limit'
import { getClientIp, isSameOriginMutationRequest } from '$lib/server/security/request'

import type { Actions, PageServerLoad } from './$types'

function normalizeNameInput(value: FormDataEntryValue | null) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

function getStudentAccessRateLimit(event: RequestEvent, bucket: string) {
  return checkRateLimit({
    bucket,
    key: getClientIp(event),
    limit: 30,
    windowMs: 10 * 60 * 1000
  })
}

export const load: PageServerLoad = async ({ url }) => {
  const errorCode = url.searchParams.get('error')

  return {
    errorMessage:
      errorCode === 'student-not-found'
        ? '이름과 PIN을 다시 확인해 주세요.'
        : errorCode === 'session-required'
          ? '이름과 PIN을 한 번 더 확인해 주세요.'
          : null
  }
}

export const actions: Actions = {
  login: async (event) => {
    if (!isSameOriginMutationRequest(event)) {
      return fail(403, {
        message: '허용되지 않은 요청이에요.'
      })
    }

    const rateLimit = getStudentAccessRateLimit(event, 'student-pin-login')

    if (!rateLimit.ok) {
      const retryAfter = formatRetryAfterDuration(rateLimit.retryAfterSec)

      return fail(429, {
        message: `PIN 입력 시도가 너무 많아요. ${retryAfter} 후 다시 시도해 주세요.`
      })
    }

    const formData = await event.request.formData()
    const name = normalizeNameInput(formData.get('name'))
    const pin = String(formData.get('pin') ?? '').trim()

    if (!name) {
      return fail(400, {
        name,
        message: '이름을 입력해 주세요.'
      })
    }

    if (name.length > 40) {
      return fail(400, {
        name,
        message: '이름이 너무 길어요. 40자 이내로 입력해 주세요.'
      })
    }

    if (!isValidStudentPinFormat(pin)) {
      return fail(400, {
        name,
        message: 'PIN 4자리 숫자를 입력해 주세요.'
      })
    }

    const candidates = await findActiveStudentsByName(name)
    const matchedStudents = candidates.filter(
      (student) => !student.pinResetRequired && verifyStudentPin(pin, student.pinHash)
    )

    if (candidates.length > 1) {
      return fail(400, {
        name,
        message: '같은 이름의 학생이 여러 명이에요. 선생님께 이름을 구분해 달라고 해 주세요.'
      })
    }

    if (matchedStudents.length === 0) {
      const setupCandidates = candidates.filter(
        (student) => student.pinResetRequired || !student.pinHash
      )

      if (setupCandidates.length === 1) {
        const student = await setStudentPinById(setupCandidates[0].id, pin)

        if (!student) {
          return fail(404, {
            name,
            message: '학생을 찾을 수 없어요.'
          })
        }

        setStudentSessionCookie(event.cookies, student.id, student.code)
        throw redirect(303, `/student/${student.code}`)
      }

      return fail(400, {
        name,
        message: '이름과 PIN이 일치하지 않아요.'
      })
    }

    const student = matchedStudents[0]
    setStudentSessionCookie(event.cookies, student.id, student.code)

    throw redirect(303, `/student/${student.code}`)
  }
}
