import {
  EMOTION_QUESTION_IDS,
  NEGATIVE_EMOTIONS,
  getEmotionAnswerSelections,
  parseIntensityScore
} from '$lib/shared/emotion-tree'
import type {
  EmotionAnswer,
  EmotionEntryRecord,
  TeacherClassEntry,
  TeacherStudentSummary
} from '$lib/shared/emotion-types'

export type SelCompetencyId = 'self' | 'communication' | 'responsibility' | 'care'

export type SelCompetency = {
  id: SelCompetencyId
  label: string
  description: string
}

export type StudentDashboardSummary = TeacherStudentSummary & {
  intensityScore: number | null
  selCompetency: SelCompetency | null
  isHighRiskToday: boolean
}

export type RiskAlert = {
  studentId: string
  studentName: string
  days: number
  latestEmotion: string
  message: string
}

export type EmotionTrend = {
  label: string
  count: number
}

export type SelTrend = {
  competency: SelCompetency
  count: number
}

export const SEL_COMPETENCIES: Record<SelCompetencyId, SelCompetency> = {
  self: {
    id: 'self',
    label: '자기인식·관리',
    description: '자신의 감정, 신념, 가치관을 이해하고 긍정적인 자기 인식을 기르는 영역'
  },
  communication: {
    id: 'communication',
    label: '소통·협력',
    description: '타인의 말을 경청하고 배려하며 갈등을 예방하고 해결하는 영역'
  },
  responsibility: {
    id: 'responsibility',
    label: '책임',
    description: '자신이 맡은 일을 성실히 수행하고 규칙을 지키는 태도'
  },
  care: {
    id: 'care',
    label: '마음돌봄',
    description: '자신의 감정을 소중히 여기고 힘들 때 스스로 위로하거나 도움을 요청하는 능력'
  }
}

export function getSelCompetencyForAnswers(answers: EmotionAnswer[]) {
  const selections = getEmotionAnswerSelections(answers)
  const emotion = selections.emotionName
  const regulation = selections.regulation

  if (!emotion || !regulation) return null

  if (regulation === '차분히 설명하기' || regulation === '먼저 인사하기') {
    return SEL_COMPETENCIES.communication
  }

  if (regulation === '내 잘못 인정하기' || regulation.includes('사과')) {
    return SEL_COMPETENCIES.responsibility
  }

  if (regulation === '나를 위로하기' || regulation === '5분 산책' || regulation === '마음껏 울기') {
    return SEL_COMPETENCIES.care
  }

  if (['기쁨', '설렘', '뿌듯함', '편안함', '불안함', '짜증남'].includes(emotion)) {
    return SEL_COMPETENCIES.self
  }

  return null
}

export function isHighRiskEmotionEntry(entry: Pick<EmotionEntryRecord, 'answers' | 'moodPrimary'>) {
  const selections = getEmotionAnswerSelections(entry.answers)
  const intensityScore = parseIntensityScore(selections.intensity)

  return intensityScore !== null && intensityScore >= 4 && NEGATIVE_EMOTIONS.has(entry.moodPrimary)
}

export function enrichStudentSummaries(
  students: TeacherStudentSummary[]
): StudentDashboardSummary[] {
  return students.map((student) => {
    const answers = student.answers
    const intensityScore = answers
      ? parseIntensityScore(getEmotionAnswerSelections(answers).intensity)
      : null

    return {
      ...student,
      intensityScore,
      selCompetency: answers ? getSelCompetencyForAnswers(answers) : null,
      isHighRiskToday:
        Boolean(student.moodPrimary) &&
        intensityScore !== null &&
        intensityScore >= 4 &&
        NEGATIVE_EMOTIONS.has(student.moodPrimary ?? '')
    }
  })
}

export function summarizeEmotionTrends(entries: TeacherClassEntry[]): EmotionTrend[] {
  const counts = new Map<string, number>()

  for (const entry of entries) {
    counts.set(entry.moodPrimary, (counts.get(entry.moodPrimary) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ko'))
}

export function summarizeSelTrends(entries: TeacherClassEntry[]): SelTrend[] {
  const counts = new Map<SelCompetencyId, number>()

  for (const entry of entries) {
    const competency = getSelCompetencyForAnswers(entry.answers)
    if (!competency) continue

    counts.set(competency.id, (counts.get(competency.id) ?? 0) + 1)
  }

  return Object.values(SEL_COMPETENCIES)
    .map((competency) => ({
      competency,
      count: counts.get(competency.id) ?? 0
    }))
    .sort((a, b) => b.count - a.count || a.competency.label.localeCompare(b.competency.label, 'ko'))
}

export function findThreeDayRiskAlerts(
  entries: TeacherClassEntry[],
  todayDate: string
): RiskAlert[] {
  const expectedDates = getRecentDateStrings(todayDate, 3)
  const entriesByStudent = new Map<string, TeacherClassEntry[]>()

  for (const entry of entries) {
    if (!expectedDates.includes(entry.entryDate)) continue

    const currentEntries = entriesByStudent.get(entry.studentId) ?? []
    currentEntries.push(entry)
    entriesByStudent.set(entry.studentId, currentEntries)
  }

  const alerts: RiskAlert[] = []

  for (const [studentId, studentEntries] of entriesByStudent.entries()) {
    const byDate = new Map(studentEntries.map((entry) => [entry.entryDate, entry]))
    const riskEntries = expectedDates
      .map((date) => byDate.get(date))
      .filter(Boolean) as TeacherClassEntry[]

    if (riskEntries.length !== expectedDates.length) continue
    if (!riskEntries.every((entry) => isHighRiskEmotionEntry(entry))) continue

    const latestEntry = byDate.get(todayDate) ?? riskEntries[0]

    alerts.push({
      studentId,
      studentName: latestEntry.studentName,
      days: expectedDates.length,
      latestEmotion: latestEntry.moodPrimary,
      message: `주의: ${latestEntry.studentName} 학생이 3일째 고위험 정서 상태입니다. 상담이 권장됩니다.`
    })
  }

  return alerts.sort((a, b) => a.studentName.localeCompare(b.studentName, 'ko'))
}

export function getRecentDateStrings(todayDate: string, days: number) {
  const dates: string[] = []
  const [year, month, day] = todayDate.split('-').map(Number)
  const today = new Date(Date.UTC(year, month - 1, day))

  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(today)
    date.setUTCDate(today.getUTCDate() - offset)
    dates.push(date.toISOString().slice(0, 10))
  }

  return dates
}

export function getEntryIntensityScore(entry: EmotionEntryRecord) {
  return parseIntensityScore(getEmotionAnswerSelections(entry.answers).intensity)
}

export function getEmotionAnswerDisplayPairs(answers: EmotionAnswer[]) {
  const selections = getEmotionAnswerSelections(answers)

  return [
    { label: '몸의 신호', value: selections.bodySignal },
    { label: '감정 이름', value: selections.emotionName },
    { label: '감정 강도', value: selections.intensity },
    { label: '장소/대상', value: selections.context },
    { label: '구체적 사건', value: selections.event },
    { label: '자기 조절', value: selections.regulation }
  ].filter((item): item is { label: string; value: string } => Boolean(item.value))
}

export function getEmotionQuestionGroupLabel(questionId: string) {
  if (questionId === EMOTION_QUESTION_IDS.bodySignal) return '몸의 신호'
  if (questionId === EMOTION_QUESTION_IDS.emotionName) return '감정 이름'
  if (questionId === EMOTION_QUESTION_IDS.intensity) return '감정 강도'
  if (questionId === EMOTION_QUESTION_IDS.context) return '장소/대상'
  if (questionId.startsWith('event:')) return '구체적 사건'
  if (questionId.startsWith('regulation:')) return '자기 조절'

  return questionId
}
