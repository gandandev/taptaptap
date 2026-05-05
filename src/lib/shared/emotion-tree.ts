import type { EmotionAnswer, EmotionTree, QuestionNode } from '$lib/shared/emotion-types'

export const EMOTION_TREE_START_ID = 'body_signal'

export const EMOTION_QUESTION_IDS = {
  bodySignal: 'body_signal',
  emotionName: 'emotion_name',
  intensity: 'intensity',
  context: 'context'
} as const

export type EmotionCategoryId = 'joy' | 'pride' | 'anger' | 'anxiety' | 'sadness' | 'low'

type EmotionCategory = {
  id: EmotionCategoryId
  emotions: string[]
  events: string[]
  regulations: string[]
}

const BODY_SIGNALS = [
  '가슴 두근거림',
  '얼굴 화끈거림',
  '어깨 무거움',
  '몸이 가뿐함',
  '손에 땀남',
  '배 아픔',
  '눈꺼풀 무거움',
  '입술 마름',
  '심장 빨리 뜀',
  '온몸 힘 빠짐'
]

const INTENSITY_CHOICES = [
  '1점(아주 살짝)',
  '2점(조금)',
  '3점(보통)',
  '4점(크게)',
  '5점(폭발 직전/최고조)'
]

const CONTEXT_CHOICES = [
  '우리 반 교실(친구)',
  '복도/운동장(선생님)',
  '집(부모님)',
  '집(형제·자매)',
  '학원(선생님/타인)',
  '온라인(SNS/게임)',
  '내 마음속(나 자신)'
]

const REGULATION_QUESTIONS_BY_CATEGORY: Record<EmotionCategoryId, string> = {
  joy: '이 기분을 오래 간직하기 위해 나에게 어떤 선물을 줄까?',
  pride: '이 기분을 오래 간직하기 위해 나에게 어떤 선물을 줄까?',
  anger: '후회하지 않으려면 지금 무엇을 하는 게 좋을까?',
  anxiety: '지금 내 마음을 가장 편안하게 해주는 선택은 뭘까?',
  sadness: '지금 내 마음을 가장 편안하게 해주는 선택은 뭘까?',
  low: '지금 내 마음을 가장 편안하게 해주는 선택은 뭘까?'
}

export const EMOTION_CATEGORIES: EmotionCategory[] = [
  {
    id: 'joy',
    emotions: ['기쁨', '설렘'],
    events: ['맛있는 급식', '칭찬 들음', '새로운 친구', '여행 앞둠'],
    regulations: ['친구와 나누기', '감사 표현하기', '오늘 즐기기']
  },
  {
    id: 'pride',
    emotions: ['뿌듯함', '편안함'],
    events: ['문제 해결함', '포기 안 함', '도움을 줌', '할 일 마침'],
    regulations: ['셀프 칭찬', '성공 비결 기록', '휴식하기']
  },
  {
    id: 'anger',
    emotions: ['화남', '억울함'],
    events: ['비웃음 당함', '물건 만짐', '오해받음', '나만 지적받음'],
    regulations: ['10초 세기', '차분히 설명하기', '도움 요청하기', '내 잘못 인정하기']
  },
  {
    id: 'anxiety',
    emotions: ['불안함', '짜증남'],
    events: ['시험/발표', '혼날 것 같음', '숙제 많음', '방해받음'],
    regulations: ['심호흡 3번', '작은 일부터 하기', '물 마시기']
  },
  {
    id: 'sadness',
    emotions: ['슬픔', '외로움'],
    events: ['물건 잃어버림', '소외감 느낌', '다퉜음', '아무도 내 맘 모름'],
    regulations: ['마음껏 울기', '나를 위로하기', '먼저 인사하기']
  },
  {
    id: 'low',
    emotions: ['무기력', '우울'],
    events: ['재미가 없음', '잠 못 잠', '나만 못하는 듯', '실수함'],
    regulations: ['스트레칭', '5분 산책', '긍정 문장 읽기']
  }
]

export const NEGATIVE_EMOTIONS = new Set([
  '화남',
  '억울함',
  '불안함',
  '짜증남',
  '슬픔',
  '외로움',
  '무기력',
  '우울'
])

export function eventQuestionId(categoryId: EmotionCategoryId) {
  return `event:${categoryId}`
}

export function regulationQuestionId(categoryId: EmotionCategoryId) {
  return `regulation:${categoryId}`
}

function toChoices(labels: string[], nextId: string | null) {
  return labels.map((label) => ({ label, nextId }))
}

function findCategoryByEmotion(emotion: string) {
  return EMOTION_CATEGORIES.find((category) => category.emotions.includes(emotion)) ?? null
}

function findCategoryById(categoryId: string) {
  return EMOTION_CATEGORIES.find((category) => category.id === categoryId) ?? null
}

export function getEmotionCategoryForEmotion(emotion: string) {
  return findCategoryByEmotion(emotion)
}

export const EMOTION_TREE: EmotionTree = {
  [EMOTION_QUESTION_IDS.bodySignal]: {
    question: '몸에서 어떤 신호가 느껴졌어?',
    choices: toChoices(BODY_SIGNALS, EMOTION_QUESTION_IDS.emotionName),
    freeTextNext: null
  },
  [EMOTION_QUESTION_IDS.emotionName]: {
    question: '그 감정에 이름을 붙이면 무엇과 가장 가까워?',
    choices: EMOTION_CATEGORIES.flatMap((category) =>
      toChoices(category.emotions, EMOTION_QUESTION_IDS.intensity)
    ),
    freeTextNext: null
  },
  [EMOTION_QUESTION_IDS.intensity]: {
    question: '감정의 크기는 어느 정도였어?',
    choices: toChoices(INTENSITY_CHOICES, EMOTION_QUESTION_IDS.context),
    freeTextNext: null
  },
  [EMOTION_QUESTION_IDS.context]: {
    question: '그 일은 어디에서, 누구와 관련 있었어?',
    choices: toChoices(CONTEXT_CHOICES, null),
    freeTextNext: null
  },
  ...Object.fromEntries(
    EMOTION_CATEGORIES.flatMap((category) => [
      [
        eventQuestionId(category.id),
        {
          question: '구체적으로 어떤 일이 있었어?',
          choices: toChoices(category.events, regulationQuestionId(category.id)),
          freeTextNext: null
        }
      ],
      [
        regulationQuestionId(category.id),
        {
          question:
            REGULATION_QUESTIONS_BY_CATEGORY[category.id] ??
            '그럼 이제 어떻게 하는 게 나를 위한 일이라고 생각해?',
          choices: toChoices(category.regulations, null),
          freeTextNext: null
        }
      ]
    ])
  )
}

export function getQuestionNode(questionId: string): QuestionNode | null {
  return EMOTION_TREE[questionId] ?? null
}

export function getQuestionLabel(questionId: string) {
  return getQuestionNode(questionId)?.question ?? questionId
}

export function getAnswer(answers: EmotionAnswer[], questionId: string) {
  return answers.find((answer) => answer.questionId === questionId)?.answer ?? null
}

export function getEmotionAnswerSelections(answers: EmotionAnswer[]) {
  const emotionName = getAnswer(answers, EMOTION_QUESTION_IDS.emotionName)
  const category = emotionName ? getEmotionCategoryForEmotion(emotionName) : null

  return {
    bodySignal: getAnswer(answers, EMOTION_QUESTION_IDS.bodySignal),
    emotionName,
    intensity: getAnswer(answers, EMOTION_QUESTION_IDS.intensity),
    context: getAnswer(answers, EMOTION_QUESTION_IDS.context),
    event: category ? getAnswer(answers, eventQuestionId(category.id)) : null,
    regulation: category ? getAnswer(answers, regulationQuestionId(category.id)) : null,
    category
  }
}

export function parseIntensityScore(intensity: string | null | undefined) {
  const scoreText = intensity?.match(/^\d/)?.[0]
  const score = Number(scoreText)

  return Number.isInteger(score) && score >= 1 && score <= 5 ? score : null
}

export function getNextQuestionId(
  questionId: string,
  answer: string,
  previousAnswers: EmotionAnswer[]
) {
  if (questionId === EMOTION_QUESTION_IDS.context) {
    const emotionName = getAnswer(previousAnswers, EMOTION_QUESTION_IDS.emotionName)
    const category = emotionName ? findCategoryByEmotion(emotionName) : null

    return category ? eventQuestionId(category.id) : null
  }

  const node = getQuestionNode(questionId)
  if (!node) return null

  return node.choices.find((choice) => choice.label === answer)?.nextId ?? null
}

export function validateEmotionAnswers(answers: EmotionAnswer[]) {
  if (!Array.isArray(answers) || answers.length === 0) {
    return { ok: false as const, error: '답변이 비어 있어요.' }
  }

  if (answers.length !== 6) {
    return { ok: false as const, error: '6단계 감정일기를 끝까지 선택해 주세요.' }
  }

  let expectedQuestionId: string | null = EMOTION_TREE_START_ID
  const acceptedAnswers: EmotionAnswer[] = []

  for (const answer of answers) {
    if (!expectedQuestionId) {
      return { ok: false as const, error: '질문 흐름이 올바르지 않아요.' }
    }

    if (answer.questionId !== expectedQuestionId) {
      return { ok: false as const, error: '질문 순서가 올바르지 않아요.' }
    }

    const node = getQuestionNode(answer.questionId)
    if (!node) {
      return { ok: false as const, error: '알 수 없는 질문이에요.' }
    }

    const trimmed = answer.answer.trim()
    if (!trimmed) {
      return { ok: false as const, error: '빈 답변은 저장할 수 없어요.' }
    }

    if (answer.questionId.length > 64) {
      return { ok: false as const, error: '질문 식별자가 올바르지 않아요.' }
    }

    if (answer.answerType !== 'choice') {
      return { ok: false as const, error: '감정일기는 선택 답변만 저장할 수 있어요.' }
    }

    if (!node.choices.some((choice) => choice.label === trimmed)) {
      return { ok: false as const, error: '선택 답변이 올바르지 않아요.' }
    }

    expectedQuestionId = getNextQuestionId(answer.questionId, trimmed, acceptedAnswers)
    acceptedAnswers.push(answer)
  }

  if (expectedQuestionId !== null) {
    return { ok: false as const, error: '마지막 단계까지 선택해 주세요.' }
  }

  const selections = getEmotionAnswerSelections(answers)

  if (!selections.category) {
    return { ok: false as const, error: '감정 선택이 올바르지 않아요.' }
  }

  const eventNode = getQuestionNode(eventQuestionId(selections.category.id))
  const regulationNode = getQuestionNode(regulationQuestionId(selections.category.id))

  if (
    !selections.event ||
    !eventNode?.choices.some((choice) => choice.label === selections.event) ||
    !selections.regulation ||
    !regulationNode?.choices.some((choice) => choice.label === selections.regulation)
  ) {
    return { ok: false as const, error: '감정에 맞는 사건과 해결 선택지가 아니에요.' }
  }

  return { ok: true as const }
}

export function deriveEmotionEntryMetadata(answers: EmotionAnswer[]) {
  const selections = getEmotionAnswerSelections(answers)

  return {
    moodPrimary: selections.emotionName ?? '미응답',
    badReasonSummary: selections.event
  }
}

export function getEmotionCategoryLabel(categoryId: string) {
  const category = findCategoryById(categoryId)

  return category ? category.emotions.join('/') : categoryId
}
