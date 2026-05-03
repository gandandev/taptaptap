import { fail, redirect } from '@sveltejs/kit'
import type { RequestEvent } from '@sveltejs/kit'

import { setStudentSessionCookie } from '$lib/server/auth/student-session'
import {
  findActiveStudentsByName,
  findStudentsByNameAndBirthDate,
  isValidStudentPinFormat,
  normalizeStudentBirthDate,
  setStudentPinById,
  verifyStudentPin
} from '$lib/server/repositories/students'
import { checkRateLimit } from '$lib/server/security/rate-limit'
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
      return fail(429, {
        message: `요청이 너무 많아요. ${rateLimit.retryAfterSec}초 후 다시 시도해 주세요.`
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

    if (matchedStudents.length === 0) {
      const needsSetup = candidates.some((student) => student.pinResetRequired || !student.pinHash)

      return fail(400, {
        name,
        message: needsSetup
          ? '처음이거나 PIN이 재설정된 학생은 아래에서 PIN을 새로 만들어 주세요.'
          : '이름과 PIN이 일치하지 않아요.'
      })
    }

    if (matchedStudents.length > 1) {
      return fail(400, {
        name,
        message: '같은 이름과 PIN의 학생이 있어요. 선생님께 확인해 주세요.'
      })
    }

    const student = matchedStudents[0]
    setStudentSessionCookie(event.cookies, student.id, student.code)

    throw redirect(303, `/student/${student.code}`)
  },

  setup: async (event) => {
    if (!isSameOriginMutationRequest(event)) {
      return fail(403, {
        setupMessage: '허용되지 않은 요청이에요.'
      })
    }

    const rateLimit = getStudentAccessRateLimit(event, 'student-pin-setup')

    if (!rateLimit.ok) {
      return fail(429, {
        setupMessage: `요청이 너무 많아요. ${rateLimit.retryAfterSec}초 후 다시 시도해 주세요.`
      })
    }

    const formData = await event.request.formData()
    const name = normalizeNameInput(formData.get('setupName'))
    const birthDateInput = String(formData.get('birthDate') ?? '').trim()
    const birthDate = normalizeStudentBirthDate(birthDateInput)
    const pin = String(formData.get('newPin') ?? '').trim()

    if (!name) {
      return fail(400, {
        setupName: name,
        birthDate: birthDateInput,
        setupMessage: '이름을 입력해 주세요.'
      })
    }

    if (name.length > 40) {
      return fail(400, {
        setupName: name,
        birthDate: birthDateInput,
        setupMessage: '이름이 너무 길어요. 40자 이내로 입력해 주세요.'
      })
    }

    if (!birthDate) {
      return fail(400, {
        setupName: name,
        birthDate: birthDateInput,
        setupMessage: '생일을 월일 4자리로 입력해 주세요. 예: 0503'
      })
    }

    if (!isValidStudentPinFormat(pin)) {
      return fail(400, {
        setupName: name,
        birthDate: birthDateInput,
        setupMessage: '새 PIN은 4자리 숫자로 입력해 주세요.'
      })
    }

    const matchedStudents = await findStudentsByNameAndBirthDate(name, birthDate)

    if (matchedStudents.length === 0) {
      return fail(400, {
        setupName: name,
        birthDate: birthDateInput,
        setupMessage: '이름과 생일이 일치하는 학생을 찾을 수 없어요.'
      })
    }

    if (matchedStudents.length > 1) {
      return fail(400, {
        setupName: name,
        birthDate: birthDateInput,
        setupMessage: '같은 이름과 생일의 학생이 있어요. 선생님께 확인해 주세요.'
      })
    }

    const student = matchedStudents[0]

    if (student.pinHash && !student.pinResetRequired) {
      return fail(400, {
        setupName: name,
        birthDate: birthDateInput,
        setupMessage: '이미 PIN이 설정되어 있어요. 잊어버렸다면 선생님께 재설정을 부탁해 주세요.'
      })
    }

    const updatedStudent = await setStudentPinById(student.id, pin)

    if (!updatedStudent) {
      return fail(404, {
        setupName: name,
        birthDate: birthDateInput,
        setupMessage: '학생을 찾을 수 없어요.'
      })
    }

    setStudentSessionCookie(event.cookies, updatedStudent.id, updatedStudent.code)

    throw redirect(303, `/student/${updatedStudent.code}`)
  }
}
