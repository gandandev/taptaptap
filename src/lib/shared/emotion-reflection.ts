import { getEmotionAnswerSelections } from '$lib/shared/emotion-tree'
import type { EmotionAnswer, EmotionReflection } from '$lib/shared/emotion-types'

const regulationAdvice: Record<string, string> = {
  '10초 세기': '잠깐 멈추고 10초를 센 선택은 마음의 브레이크를 잘 잡은 거야.',
  '차분히 설명하기': "나중에 차분해졌을 때 '나는 이렇게 느꼈어'라고 말해보면 좋아.",
  '도움 요청하기': '혼자 버티기 어려울 때 어른이나 믿는 친구에게 말하는 건 아주 좋은 방법이야.',
  '심호흡 3번': '숨을 천천히 들이마시고 내쉬면 몸이 먼저 편안해질 수 있어.',
  '작은 일부터 하기': '큰 걱정은 작은 일 하나부터 시작하면 조금씩 작아질 수 있어.',
  '나를 위로하기': '오늘 힘들었던 마음을 알아차리고 다정하게 대해준 것만으로도 충분히 잘했어.',
  '먼저 인사하기': '먼저 다가가려는 용기는 관계를 다시 따뜻하게 만들 수 있어.',
  '5분 산책': '잠깐 몸을 움직이면 마음도 조금씩 깨어날 수 있어.',
  '내 잘못 인정하기': '내 행동을 돌아보는 건 용기가 필요한 일이야. 그 마음이 책임의 시작이야.'
}

export function buildLocalEmotionReflection(answers: EmotionAnswer[]): EmotionReflection {
  const selections = getEmotionAnswerSelections(answers)
  const bodySignal = selections.bodySignal ?? '몸의 신호'
  const emotionName = selections.emotionName ?? '감정'
  const intensity = selections.intensity ?? '감정의 크기'
  const context = selections.context ?? '어떤 곳'
  const event = selections.event ?? '어떤 일'
  const regulation = selections.regulation ?? '나를 도와주는 방법'
  const advice =
    regulationAdvice[regulation] ??
    `${regulation}을 선택한 건 네 마음을 돌보려는 좋은 시도야. 다음에도 그 방법을 천천히 써보자.`

  return {
    summary: `오늘 나는 ${context}에서 ${event} 때문에 ${bodySignal}을 느낄 만큼 ${emotionName}이 ${intensity}이었어. 그래서 ${regulation}을 선택했어.`,
    advice,
    source: 'local'
  }
}
