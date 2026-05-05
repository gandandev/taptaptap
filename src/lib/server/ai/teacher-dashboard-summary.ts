import 'dotenv/config'

import { createHash } from 'node:crypto'

import { env } from '$env/dynamic/private'

import type {
  EmotionAnswer,
  TeacherClassEntry,
  TeacherStudentSummary
} from '$lib/shared/emotion-types'
import {
  NEGATIVE_EMOTIONS,
  getEmotionAnswerSelections,
  parseIntensityScore
} from '$lib/shared/emotion-tree'
import {
  SEL_COMPETENCIES,
  type RiskAlert,
  type SelCompetency,
  type SelCompetencyId,
  type SelTrend
} from '$lib/shared/emotion-analysis'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_MODEL = 'openai/gpt-oss-120b:nitro'
const OPENROUTER_TIMEOUT_MS = 8_000

export type TeacherDashboardAiSummary = {
  bullets: string[]
  neededCompetency: SelCompetency
  source: 'ai' | 'local'
}

type ParsedTeacherDashboardAiSummary = {
  bullets: string[]
  neededCompetencyId: SelCompetencyId
}

type PeerNameMentionSignal = {
  mentionedByStudentName: string
  mentionedStudentName: string
  entryDate: string
  matchedAnswers: string[]
}

export class TeacherDashboardAiGenerationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TeacherDashboardAiGenerationError'
  }
}

export function hasTeacherDashboardAiProvider() {
  return Boolean(env.OPENROUTER_API_KEY?.trim())
}

const COMPETENCY_LABEL_TO_ID = Object.fromEntries(
  Object.values(SEL_COMPETENCIES).map((competency) => [competency.label, competency.id])
) as Record<string, SelCompetencyId>

function inferCompetencyId(value: unknown, bullets: string[]): SelCompetencyId | null {
  const explicitValue = typeof value === 'string' ? value.trim() : ''

  if (explicitValue in SEL_COMPETENCIES) {
    return explicitValue as SelCompetencyId
  }

  if (explicitValue && explicitValue in COMPETENCY_LABEL_TO_ID) {
    return COMPETENCY_LABEL_TO_ID[explicitValue]
  }

  const text = [explicitValue, ...bullets].join(' ').toLowerCase()

  if (/communication|소통|협력|의사소통|갈등|관계|친구/.test(text)) {
    return 'communication'
  }

  if (/care|마음.?돌봄|돌봄|위로|도움 요청|스트레스|불안|우울|힘들/.test(text)) {
    return 'care'
  }

  if (/responsibility|책임|규칙|할 일|숙제|성실|실수/.test(text)) {
    return 'responsibility'
  }

  if (/self|자기|감정.*인식|자기인식|조절|관리/.test(text)) {
    return 'self'
  }

  return null
}

function sanitizeBullet(value: unknown) {
  if (typeof value !== 'string') return null

  const bullet = value
    .replace(/^[\s•\-*]+/, '')
    .replace(/학생도/g, '학생은')
    .trim()
    .slice(0, 140)

  if (/교사는|해야 함|해야함|필요함|필요가 있음|제안함|권장함/.test(bullet)) {
    return null
  }

  return bullet.length > 0 ? bullet : null
}

function parseTeacherDashboardSummary(
  content: string,
  fallbackCompetencyId: SelCompetencyId
): ParsedTeacherDashboardAiSummary | null {
  try {
    const parsed = JSON.parse(content) as {
      bullets?: unknown
      competencyId?: unknown
      competency?: unknown
      neededCompetencyId?: unknown
      neededCompetencyLabel?: unknown
      neededCompetibilityId?: unknown
    }

    const bullets = Array.isArray(parsed.bullets)
      ? parsed.bullets.map(sanitizeBullet).filter((bullet): bullet is string => Boolean(bullet))
      : []
    const competencyId =
      inferCompetencyId(
        parsed.neededCompetencyId ??
          parsed.neededCompetencyLabel ??
          parsed.neededCompetibilityId ??
          parsed.competencyId ??
          parsed.competency,
        bullets
      ) ?? fallbackCompetencyId

    if (bullets.length >= 1 && bullets.length <= 3 && competencyId) {
      return {
        bullets,
        neededCompetencyId: competencyId
      }
    }
  } catch {
    return null
  }

  return null
}

function getEntrySelections(answers: EmotionAnswer[]) {
  const selections = getEmotionAnswerSelections(answers)
  const intensityScore = parseIntensityScore(selections.intensity)

  return {
    ...selections,
    intensityScore
  }
}

function isConflictEntry(answers: EmotionAnswer[]) {
  const selections = getEntrySelections(answers)
  const text = [selections.context, selections.event, selections.regulation]
    .filter(Boolean)
    .join(' ')

  return /친구|SNS|게임|비웃음|물건 만짐|오해|소외감|다퉜음|방해받음|나만 지적/.test(text)
}

function findPeerNameMentions(
  entries: TeacherClassEntry[],
  students: TeacherStudentSummary[]
): PeerNameMentionSignal[] {
  const normalizeNameMatchText = (value: string) => value.replace(/\s+/g, '')
  const studentNames = students
    .map((student) => ({
      studentId: student.studentId,
      name: student.name.trim(),
      normalizedName: normalizeNameMatchText(student.name)
    }))
    .filter((student) => student.name.length >= 2)
  const signals: PeerNameMentionSignal[] = []

  for (const entry of entries) {
    const answersText = entry.answers.map((answer) => answer.answer)

    for (const student of studentNames) {
      if (student.studentId === entry.studentId) continue

      const matchedAnswers = answersText.filter(
        (answer) =>
          answer.includes(student.name) ||
          normalizeNameMatchText(answer).includes(student.normalizedName)
      )

      if (matchedAnswers.length === 0) continue

      signals.push({
        mentionedByStudentName: entry.studentName,
        mentionedStudentName: student.name,
        entryDate: entry.entryDate,
        matchedAnswers
      })
    }
  }

  return signals
}

function getNeededCompetencyScores(entries: TeacherClassEntry[], riskAlerts: RiskAlert[]) {
  const scores = new Map<SelCompetencyId, number>(
    Object.keys(SEL_COMPETENCIES).map((id) => [id as SelCompetencyId, 0])
  )

  for (const entry of entries) {
    const selections = getEntrySelections(entry.answers)
    const isNegative = NEGATIVE_EMOTIONS.has(entry.moodPrimary)
    const isHighIntensity = (selections.intensityScore ?? 0) >= 4

    if (isConflictEntry(entry.answers)) {
      scores.set('communication', (scores.get('communication') ?? 0) + 2)
    }

    if (isNegative && isHighIntensity) {
      scores.set('care', (scores.get('care') ?? 0) + 2)
    }

    if (
      selections.event &&
      /숙제|할 일|실수|내 잘못|포기|문제 해결|나만 못하는/.test(selections.event)
    ) {
      scores.set('responsibility', (scores.get('responsibility') ?? 0) + 1)
    }

    if (selections.emotionName && selections.intensityScore !== null) {
      scores.set('self', (scores.get('self') ?? 0) + 1)
    }
  }

  for (const alert of riskAlerts) {
    scores.set('care', (scores.get('care') ?? 0) + alert.days)
  }

  return Object.values(SEL_COMPETENCIES)
    .map((competency) => ({
      competency,
      score: scores.get(competency.id) ?? 0
    }))
    .sort((a, b) => b.score - a.score || a.competency.label.localeCompare(b.competency.label, 'ko'))
}

export function getMostNeededCompetency(entries: TeacherClassEntry[], riskAlerts: RiskAlert[]) {
  const [topScore] = getNeededCompetencyScores(entries, riskAlerts)

  return topScore && topScore.score > 0 ? topScore.competency : SEL_COMPETENCIES.self
}

export function buildTeacherDashboardSignature({
  todayDate,
  students
}: {
  todayDate: string
  students: TeacherStudentSummary[]
}) {
  const submittedStudents = students
    .filter((student) => student.hasSubmittedToday)
    .map((student) => ({
      studentId: student.studentId,
      submittedAt: student.submittedAt?.toISOString() ?? null,
      moodPrimary: student.moodPrimary,
      badReasonSummary: student.badReasonSummary
    }))
    .sort((a, b) => a.studentId.localeCompare(b.studentId))

  return createHash('sha256').update(JSON.stringify({ todayDate, submittedStudents })).digest('hex')
}

export function buildLocalTeacherDashboardSummary({
  todayDate,
  todayStudents,
  recentEntries,
  riskAlerts,
  selTrends
}: {
  todayDate: string
  todayStudents: TeacherStudentSummary[]
  recentEntries: TeacherClassEntry[]
  riskAlerts: RiskAlert[]
  selTrends: SelTrend[]
}): TeacherDashboardAiSummary {
  const submittedToday = todayStudents.filter((student) => student.hasSubmittedToday)
  const neededCompetency = getMostNeededCompetency(recentEntries, riskAlerts)
  const conflictEntries = recentEntries.filter((entry) => isConflictEntry(entry.answers))
  const conflictNames = [...new Set(conflictEntries.map((entry) => entry.studentName))].slice(0, 4)
  const peerNameMentions = findPeerNameMentions(recentEntries, todayStudents)
  const bullets: string[] = []

  if (submittedToday.length === 0) {
    bullets.push(`${todayDate} 기준 제출된 감정일기가 아직 없어 학급 판단은 보류함`)
  } else {
    for (const student of submittedToday.slice(0, 3)) {
      const selections = student.answers ? getEntrySelections(student.answers) : null
      const details = [
        student.moodPrimary ? `${student.moodPrimary} 감정` : null,
        selections?.context ? `${selections.context}` : null,
        selections?.event ? `${selections.event}` : null
      ]
        .filter(Boolean)
        .join(', ')

      bullets.push(
        `${student.name} 학생 기록에서 ${details || neededCompetency.label} 단서가 나타남`
      )
    }
  }

  if (riskAlerts.length > 0) {
    const names = riskAlerts
      .slice(0, 3)
      .map((alert) => alert.studentName)
      .join(', ')
    bullets.push(`${names} 학생에게 부정 감정이 3일 이상 이어짐`)
  } else if (conflictNames.length > 0) {
    bullets.push(`${conflictNames.join(', ')} 학생 기록에서 친구·관계 갈등 단서가 나타남`)
  }

  if (peerNameMentions.length > 0 && bullets.length < 3) {
    const names = peerNameMentions
      .slice(0, 3)
      .map((signal) => `${signal.mentionedByStudentName}->${signal.mentionedStudentName}`)
      .join(', ')
    bullets.push(`${names} 이름 언급이 기록되어 관계 맥락 단서가 나타남`)
  }

  const topSelTrend = selTrends[0]
  if (topSelTrend && topSelTrend.count > 0 && bullets.length < 3) {
    bullets.push(
      `${topSelTrend.competency.label} 관련 선택이 최근 기록에서 ${topSelTrend.count}건 나타남`
    )
  }

  return {
    bullets: bullets.slice(0, 3),
    neededCompetency,
    source: 'local'
  }
}

export async function generateTeacherDashboardSummary({
  todayDate,
  todayStudents,
  recentEntries,
  riskAlerts,
  selTrends
}: {
  todayDate: string
  todayStudents: TeacherStudentSummary[]
  recentEntries: TeacherClassEntry[]
  riskAlerts: RiskAlert[]
  selTrends: SelTrend[]
}): Promise<TeacherDashboardAiSummary> {
  const fallback = buildLocalTeacherDashboardSummary({
    todayDate,
    todayStudents,
    recentEntries,
    riskAlerts,
    selTrends
  })
  const apiKey = env.OPENROUTER_API_KEY?.trim()

  if (!apiKey) {
    return fallback
  }

  const submittedToday = todayStudents.filter((student) => student.hasSubmittedToday)
  const competencyScores = getNeededCompetencyScores(recentEntries, riskAlerts)
  const peerNameMentions = findPeerNameMentions(recentEntries, todayStudents)
  const recentEntriesForPrompt = recentEntries.slice(0, 12)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS)

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        'x-title': 'TapTapTap Teacher Dashboard'
      },
      body: JSON.stringify({
        model: env.OPENROUTER_MODEL || DEFAULT_MODEL,
        temperature: 0.25,
        max_tokens: 800,
        reasoning: { exclude: true },
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              '너는 초등학교 교사를 돕는 한국형 사회정서교육(SEL) 학급 관찰 보조자다. 의료 진단, 낙인, 단정, 행동 조언은 피하고 관찰 단서만 간결히 제시한다. 반드시 JSON 객체로만 답한다.'
          },
          {
            role: 'user',
            content: JSON.stringify({
              instruction:
                'classData의 원본 정보를 기본 근거로 보고, automaticSignals는 추가 참고 단서로만 사용해 교사용 학급 관찰 bullet 1~3개를 한국어 "~함" 체로 작성해줘. 가능한 한 bullet 하나에는 학생 한 명만 다뤄줘. 같은 패턴을 보인 학생도 한 bullet에 묶지 말고 각각 이름을 지목해줘. 각 bullet은 반드시 "<학생이름> 학생은" 또는 "<학생이름> 학생이"로 시작해줘. "학생도"처럼 앞 bullet에 기대는 표현은 쓰지 마. "학생들이", "다수 학생", "일부 학생", "같은 학생"처럼 뭉뚱그리는 표현은 쓰지 마. "교사는", "해야 함", "필요함", "제안함", "권장함" 같은 행동 조언 문장은 쓰지 말고 관찰된 사실만 써줘. 학생 간 다툼, 소외, 비웃음, 온라인 갈등, 다른 학생 이름 언급 등 관계 위험 단서가 있으면 요약에 포함해줘. neededCompetencyId는 반드시 self, communication, responsibility, care 중 정확히 하나의 문자열로 반환해줘. bullets와 neededCompetencyId 키만 반환해줘.',
              competencies: {
                self: '자기인식·관리: 자신의 감정, 신념, 가치관을 이해하고 긍정적인 자기 인식을 기르는 영역',
                communication:
                  '소통·협력: 타인의 말을 경청하고 배려하며 갈등을 예방하고 해결하는 영역',
                responsibility: '책임: 자신이 맡은 일을 성실히 수행하고 규칙을 지키는 태도',
                care: '마음돌봄: 자신의 감정을 소중히 여기고 힘들 때 스스로 위로하거나 도움을 요청하는 능력'
              },
              classData: {
                todayDate,
                roster: {
                  totalCount: todayStudents.length,
                  submittedTodayCount: submittedToday.length
                },
                submittedToday: submittedToday.map((student) => ({
                  studentName: student.name,
                  moodPrimary: student.moodPrimary,
                  selections: student.answers ? getEntrySelections(student.answers) : null
                })),
                recentEntries: recentEntriesForPrompt.map((entry) => ({
                  studentName: entry.studentName,
                  entryDate: entry.entryDate,
                  moodPrimary: entry.moodPrimary,
                  selections: getEntrySelections(entry.answers)
                }))
              },
              automaticSignals: {
                threeDayStressStudents: riskAlerts.map((alert) => ({
                  studentName: alert.studentName,
                  days: alert.days,
                  latestEmotion: alert.latestEmotion
                })),
                peerNameMentions,
                neededCompetencyScores: competencyScores.map((score) => ({
                  id: score.competency.id,
                  label: score.competency.label,
                  score: score.score
                }))
              }
            })
          }
        ]
      })
    })

    if (!response.ok) {
      throw new TeacherDashboardAiGenerationError(
        `OpenRouter request failed with ${response.status}`
      )
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>
    }
    const content = payload.choices?.[0]?.message?.content

    if (typeof content !== 'string') {
      throw new TeacherDashboardAiGenerationError('OpenRouter response did not include content')
    }

    const parsed = parseTeacherDashboardSummary(content, fallback.neededCompetency.id)

    if (!parsed) {
      throw new TeacherDashboardAiGenerationError('OpenRouter response was not valid summary JSON')
    }

    return {
      bullets: parsed.bullets,
      neededCompetency: SEL_COMPETENCIES[parsed.neededCompetencyId],
      source: 'ai'
    }
  } catch (error) {
    if (error instanceof TeacherDashboardAiGenerationError) {
      throw error
    }

    throw new TeacherDashboardAiGenerationError(
      error instanceof Error ? error.message : 'OpenRouter request failed'
    )
  } finally {
    clearTimeout(timeout)
  }
}
