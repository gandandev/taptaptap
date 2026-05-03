import { env } from '$env/dynamic/private'

import { buildLocalEmotionReflection } from '$lib/shared/emotion-reflection'
import { getEmotionAnswerSelections } from '$lib/shared/emotion-tree'
import type { EmotionAnswer, EmotionReflection } from '$lib/shared/emotion-types'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_MODEL = 'openai/gpt-oss-120b'

function parseReflectionFromContent(
  content: string
): Pick<EmotionReflection, 'summary' | 'advice'> | null {
  try {
    const parsed = JSON.parse(content) as { summary?: unknown; advice?: unknown }

    if (typeof parsed.summary === 'string' && typeof parsed.advice === 'string') {
      return {
        summary: parsed.summary.trim().slice(0, 260),
        advice: parsed.advice.trim().slice(0, 260)
      }
    }
  } catch {
    return null
  }

  return null
}

export async function generateEmotionReflection(
  answers: EmotionAnswer[]
): Promise<EmotionReflection> {
  const fallback = buildLocalEmotionReflection(answers)
  const apiKey = env.OPENROUTER_API_KEY

  if (!apiKey) {
    return fallback
  }

  const selections = getEmotionAnswerSelections(answers)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        'x-title': 'TapTapTap Emotion Diary'
      },
      body: JSON.stringify({
        model: env.OPENROUTER_MODEL || DEFAULT_MODEL,
        temperature: 0.4,
        max_tokens: 220,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              '너는 초등학교 5학년 학생을 돕는 사회정서학습(SEL) 코치다. 진단, 치료, 낙인 표현을 피하고 따뜻하고 짧게 말한다. 반드시 JSON 객체로만 답한다.'
          },
          {
            role: 'user',
            content: JSON.stringify({
              instruction:
                '아래 선택값으로 학생용 일기 요약 1문장과 조언 1문장을 한국어로 작성해줘. 각각 120자 이내. 키는 summary, advice만 사용.',
              selections
            })
          }
        ]
      })
    })

    if (!response.ok) {
      return fallback
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>
    }
    const content = payload.choices?.[0]?.message?.content

    if (typeof content !== 'string') {
      return fallback
    }

    const reflection = parseReflectionFromContent(content)

    return reflection ? { ...reflection, source: 'ai' } : fallback
  } catch {
    return fallback
  } finally {
    clearTimeout(timeout)
  }
}
