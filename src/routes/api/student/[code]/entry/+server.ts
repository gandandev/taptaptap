import { json } from '@sveltejs/kit'

import { upsertEmotionEntryForStudentToday } from '$lib/server/repositories/emotion-entries'
import { findStudentByCode, isValidStudentCodeFormat } from '$lib/server/repositories/students'
import { checkRateLimit } from '$lib/server/security/rate-limit'
import {
  exceedsContentLength,
  getClientIp,
  isJsonContentType,
  isSameOriginMutationRequest
} from '$lib/server/security/request'
import { validateEmotionAnswers } from '$lib/shared/emotion-tree'
import type { EmotionAnswer } from '$lib/shared/emotion-types'

import type { RequestHandler } from './$types'

function parseEmotionAnswers(value: unknown): EmotionAnswer[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  if (value.length === 0 || value.length > 12) {
    return null
  }

  const parsed: EmotionAnswer[] = []

  for (const item of value) {
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof item.questionId !== 'string' ||
      typeof item.answer !== 'string' ||
      (item.answerType !== 'choice' && item.answerType !== 'text')
    ) {
      return null
    }

    if (item.questionId.length > 64 || item.answer.length > 500) {
      return null
    }

    parsed.push({
      questionId: item.questionId.trim(),
      answer: item.answer.trim(),
      answerType: item.answerType
    })
  }

  return parsed
}

export const POST: RequestHandler = async (event) => {
  if (!isSameOriginMutationRequest(event)) {
    return json({ ok: false, error: '허용되지 않은 요청이에요.' }, { status: 403 })
  }

  const { params, request } = event

  if (!isJsonContentType(request)) {
    return json({ ok: false, error: '요청 형식이 올바르지 않아요.' }, { status: 415 })
  }

  if (exceedsContentLength(request, 16 * 1024)) {
    return json({ ok: false, error: '요청 데이터가 너무 커요.' }, { status: 413 })
  }

  const ip = getClientIp(event)
  const perIpLimit = checkRateLimit({
    bucket: 'student-entry-submit-ip',
    key: ip,
    limit: 40,
    windowMs: 10 * 60 * 1000
  })

  if (!perIpLimit.ok) {
    return json(
      { ok: false, error: `요청이 너무 많아요. ${perIpLimit.retryAfterSec}초 후 다시 시도해 주세요.` },
      {
        status: 429,
        headers: {
          'retry-after': String(perIpLimit.retryAfterSec)
        }
      }
    )
  }

  const code = params.code.trim()

  if (!isValidStudentCodeFormat(code)) {
    return json({ ok: false, error: '학생 코드가 올바르지 않아요.' }, { status: 400 })
  }

  const student = await findStudentByCode(code)

  if (!student || !student.isActive) {
    return json({ ok: false, error: '학생을 찾을 수 없어요.' }, { status: 404 })
  }

  const perStudentLimit = checkRateLimit({
    bucket: 'student-entry-submit-student',
    key: `${ip}:${code}`,
    limit: 15,
    windowMs: 5 * 60 * 1000
  })

  if (!perStudentLimit.ok) {
    return json(
      {
        ok: false,
        error: `잠시 후 다시 저장해 주세요. ${perStudentLimit.retryAfterSec}초 후 재시도 가능해요.`
      },
      {
        status: 429,
        headers: {
          'retry-after': String(perStudentLimit.retryAfterSec)
        }
      }
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return json({ ok: false, error: '요청 형식이 올바르지 않아요.' }, { status: 400 })
  }

  const answers = parseEmotionAnswers((body as { answers?: unknown })?.answers)

  if (!answers) {
    return json({ ok: false, error: '답변 형식이 올바르지 않아요.' }, { status: 400 })
  }

  const validation = validateEmotionAnswers(answers)

  if (!validation.ok) {
    return json({ ok: false, error: validation.error }, { status: 400 })
  }

  try {
    const entry = await upsertEmotionEntryForStudentToday({
      studentId: student.id,
      answers
    })

    return json({
      ok: true,
      entryDate: entry.entryDate,
      updatedAt: entry.updatedAt
    })
  } catch {
    return json({ ok: false, error: '저장 중 오류가 발생했어요.' }, { status: 500 })
  }
}
