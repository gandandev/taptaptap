export type QuestionChoice = {
  label: string
  nextId: string | null
}

export type QuestionNode = {
  question: string
  choices: QuestionChoice[]
  freeTextNext: string | null
}

export type EmotionTree = Record<string, QuestionNode>
export type QuestionId = string

export type EmotionAnswer = {
  questionId: QuestionId
  answer: string
  answerType: 'choice' | 'text'
}

export type EmotionEntryPayload = {
  answers: EmotionAnswer[]
}

export type EmotionEntryRecord = {
  id: string
  studentId: string
  entryDate: string
  answers: EmotionAnswer[]
  moodPrimary: string
  badReasonSummary: string | null
  submittedAt: Date
  updatedAt: Date
}

export type TeacherStudentSummary = {
  studentId: string
  name: string
  code: string
  hasSubmittedToday: boolean
  moodPrimary: string | null
  badReasonSummary: string | null
  submittedAt: Date | null
}
