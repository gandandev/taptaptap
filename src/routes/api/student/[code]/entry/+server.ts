import { json } from '@sveltejs/kit'

import { upsertEmotionEntryForStudentToday } from '$lib/server/repositories/emotion-entries'
import { findStudentByCode, isValidStudentCodeFormat } from '$lib/server/repositories/students'
import { validateEmotionAnswers } from '$lib/shared/emotion-tree'
import type { EmotionAnswer } from '$lib/shared/emotion-types'

import type { RequestHandler } from './$types'

function parseEmotionAnswers(value: unknown): EmotionAnswer[] | null {
  if (!Array.isArray(value)) {
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

    parsed.push({
      questionId: item.questionId,
      answer: item.answer,
      answerType: item.answerType
    })
  }

  return parsed
}

export const POST: RequestHandler = async ({ params, request }) => {
  const code = params.code.trim()

  if (!isValidStudentCodeFormat(code)) {
    return json({ ok: false, error: '학생 코드가 올바르지 않아요.' }, { status: 400 })
  }

  const student = await findStudentByCode(code)

  if (!student || !student.isActive) {
    return json({ ok: false, error: '학생을 찾을 수 없어요.' }, { status: 404 })
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
