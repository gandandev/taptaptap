import type { EmotionAnswer, EmotionTree } from '$lib/shared/emotion-types'

export const EMOTION_TREE_START_ID = 'mood'

export const EMOTION_TREE: EmotionTree = {
  mood: {
    question: '오늘 기분이 어때?',
    choices: [
      { label: '좋아!', nextId: 'good_why' },
      { label: '그냥 그래', nextId: 'neutral_why' },
      { label: '안 좋아...', nextId: 'bad_why' }
    ],
    freeTextNext: 'final'
  },
  good_why: {
    question: '어떤 좋은 일이 있었어?',
    choices: [
      { label: '친구랑 재밌게 놀았어', nextId: 'good_feeling' },
      { label: '칭찬받았어', nextId: 'good_feeling' },
      { label: '재밌는 걸 배웠어', nextId: 'good_feeling' },
      { label: '시험을 잘 봤어', nextId: 'good_feeling' }
    ],
    freeTextNext: 'good_feeling'
  },
  good_feeling: {
    question: '그래서 지금 기분이 어때?',
    choices: [
      { label: '너무 신나!', nextId: 'final' },
      { label: '뿌듯해', nextId: 'final' },
      { label: '행복해', nextId: 'final' },
      { label: '감사한 마음이야', nextId: 'final' }
    ],
    freeTextNext: 'final'
  },
  neutral_why: {
    question: '오늘 하루 어땠어?',
    choices: [
      { label: '그냥 평범했어', nextId: 'neutral_wish' },
      { label: '좀 심심했어', nextId: 'neutral_wish' },
      { label: '피곤했어', nextId: 'neutral_wish' },
      { label: '잘 모르겠어', nextId: 'neutral_wish' }
    ],
    freeTextNext: 'neutral_wish'
  },
  neutral_wish: {
    question: '내일은 어떤 하루였으면 좋겠어?',
    choices: [
      { label: '재밌는 하루!', nextId: 'final' },
      { label: '편안한 하루', nextId: 'final' },
      { label: '오늘이랑 비슷하면 돼', nextId: 'final' }
    ],
    freeTextNext: 'final'
  },
  bad_why: {
    question: '무슨 일이 있었어?',
    choices: [
      { label: '친구랑 다퉜어', nextId: 'bad_now' },
      { label: '수업이 어려웠어', nextId: 'bad_now' },
      { label: '혼났어', nextId: 'bad_now' },
      { label: '몸이 안 좋았어', nextId: 'final' },
      { label: '속상한 일이 있었어', nextId: 'bad_now' }
    ],
    freeTextNext: 'bad_now'
  },
  bad_now: {
    question: '지금은 기분이 좀 어때?',
    choices: [
      { label: '아직 속상해', nextId: 'bad_help' },
      { label: '좀 나아졌어', nextId: 'final' },
      { label: '잘 모르겠어', nextId: 'bad_help' }
    ],
    freeTextNext: 'final'
  },
  bad_help: {
    question: '어떻게 하면 기분이 나아질까?',
    choices: [
      { label: '친구랑 이야기하고 싶어', nextId: 'final' },
      { label: '혼자 쉬고 싶어', nextId: 'final' },
      { label: '재밌는 걸 하고 싶어', nextId: 'final' },
      { label: '누군가한테 말하고 싶어', nextId: 'final' }
    ],
    freeTextNext: 'final'
  },
  final: {
    question: '오늘 하루, 하고 싶은 말이 있어?',
    choices: [],
    freeTextNext: null
  }
}

function getChoiceNextId(questionId: string, answer: string): string | null | undefined {
  const node = EMOTION_TREE[questionId]
  if (!node) return undefined
  return node.choices.find((choice) => choice.label === answer)?.nextId
}

export function validateEmotionAnswers(answers: EmotionAnswer[]) {
  if (!Array.isArray(answers) || answers.length === 0) {
    return { ok: false as const, error: '답변이 비어 있어요.' }
  }

  let expectedQuestionId: string | null = EMOTION_TREE_START_ID

  for (const answer of answers) {
    if (!expectedQuestionId) {
      return { ok: false as const, error: '질문 흐름이 올바르지 않아요.' }
    }

    if (answer.questionId !== expectedQuestionId) {
      return { ok: false as const, error: '질문 순서가 올바르지 않아요.' }
    }

    const node = EMOTION_TREE[answer.questionId]
    if (!node) {
      return { ok: false as const, error: '알 수 없는 질문이에요.' }
    }

    const trimmed = answer.answer.trim()
    if (!trimmed) {
      return { ok: false as const, error: '빈 답변은 저장할 수 없어요.' }
    }

    if (answer.answerType === 'choice') {
      const nextId = getChoiceNextId(answer.questionId, trimmed)

      if (nextId === undefined) {
        return { ok: false as const, error: '선택 답변이 올바르지 않아요.' }
      }

      expectedQuestionId = nextId
      continue
    }

    if (answer.answerType === 'text') {
      expectedQuestionId = node.freeTextNext
      continue
    }

    return { ok: false as const, error: '답변 형식이 올바르지 않아요.' }
  }

  return { ok: true as const }
}

export function deriveEmotionEntryMetadata(answers: EmotionAnswer[]) {
  const moodPrimary = answers.find((answer) => answer.questionId === 'mood')?.answer ?? '미응답'
  const badReasonSummary = answers.find((answer) => answer.questionId === 'bad_why')?.answer ?? null

  return { moodPrimary, badReasonSummary }
}
