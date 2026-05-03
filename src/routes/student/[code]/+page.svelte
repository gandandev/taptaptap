<script lang="ts">
  import CheckCircle2 from '@lucide/svelte/icons/check-circle-2'
  import LoaderCircle from '@lucide/svelte/icons/loader-circle'
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw'
  import { untrack } from 'svelte'

  import { Alert, AlertDescription } from '$lib/components/ui/alert'
  import { Badge } from '$lib/components/ui/badge'
  import { Button } from '$lib/components/ui/button'
  import {
    getEmotionAnswerDisplayPairs,
    getEmotionQuestionGroupLabel
  } from '$lib/shared/emotion-analysis'
  import { buildLocalEmotionReflection } from '$lib/shared/emotion-reflection'
  import {
    EMOTION_TREE_START_ID,
    getNextQuestionId,
    getQuestionNode
  } from '$lib/shared/emotion-tree'
  import type { EmotionAnswer, EmotionReflection } from '$lib/shared/emotion-types'

  import type { PageProps } from './$types'

  let { data }: PageProps = $props()
  const initialSavedAnswers = untrack(() => data.savedEntry?.answers ?? [])
  const hasInitialSavedEntry = untrack(() => Boolean(data.savedEntry))
  const initialReflection = untrack(() =>
    initialSavedAnswers.length === 6 ? buildLocalEmotionReflection(initialSavedAnswers) : null
  )

  let answers: EmotionAnswer[] = $state([])
  let completedAnswers: EmotionAnswer[] = $state(initialSavedAnswers)
  let completedReflection: EmotionReflection | null = $state(initialReflection)
  let questionId = $state(EMOTION_TREE_START_ID)
  let done = $state(hasInitialSavedEntry)
  let saving = $state(false)
  let errorMessage = $state('')
  let successMessage = $state('')

  let currentNode = $derived(getQuestionNode(questionId))
  let displayedAnswers = $derived(done ? completedAnswers : answers)
  let displayedPairs = $derived(getEmotionAnswerDisplayPairs(displayedAnswers))
  let stepNumber = $derived(Math.min(answers.length + 1, 6))
  let progressPercent = $derived(done ? 100 : Math.round(((stepNumber - 1) / 6) * 100))

  function resetDraft() {
    answers = []
    questionId = EMOTION_TREE_START_ID
    completedReflection = null
    errorMessage = ''
    successMessage = ''
  }

  function startRewrite() {
    done = false
    resetDraft()
  }

  function pickChoice(qId: string, label: string) {
    if (saving) return

    const nextAnswers = [
      ...answers,
      {
        questionId: qId,
        answer: label,
        answerType: 'choice' as const
      }
    ]
    const nextId = getNextQuestionId(qId, label, answers)

    answers = nextAnswers

    if (nextId) {
      questionId = nextId
      return
    }

    void finish(nextAnswers)
  }

  async function finish(finalAnswers: EmotionAnswer[]) {
    if (saving) return

    saving = true
    errorMessage = ''
    successMessage = ''

    try {
      const response = await fetch(`/api/student/${data.student.code}/entry`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({ answers: finalAnswers })
      })

      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean
        error?: string
        reflection?: EmotionReflection
      } | null

      if (!response.ok || !payload?.ok) {
        errorMessage = payload?.error ?? '저장에 실패했어요. 다시 시도해 주세요.'
        return
      }

      completedAnswers = [...finalAnswers]
      completedReflection = payload.reflection ?? buildLocalEmotionReflection(finalAnswers)
      done = true
      successMessage = '오늘 감정일기를 저장했어요.'
    } catch {
      errorMessage = '저장 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.'
    } finally {
      saving = false
    }
  }
</script>

<svelte:head>
  <title>감정일기 | {data.student.name}</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-6 sm:px-6">
  <section class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-3 border-b pb-5">
      <div class="space-y-2">
        <Badge variant="outline">감정일기</Badge>
        <h1 class="text-2xl font-semibold tracking-tight">{data.student.name}의 감정일기</h1>
        <p class="text-sm text-muted-foreground">오늘 날짜 (KST): {data.todayDate}</p>
      </div>
      <Button href="/" variant="outline" size="sm">이름/생일 다시 확인</Button>
    </div>

    {#if successMessage}
      <Alert>
        <CheckCircle2 class="size-4" />
        <AlertDescription>{successMessage}</AlertDescription>
      </Alert>
    {/if}

    {#if errorMessage}
      <Alert variant="destructive">
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
    {/if}

    <div class="space-y-2">
      <div class="flex items-center justify-between gap-3 text-sm">
        <span class="font-medium">{done ? '완료' : `${stepNumber}/6단계`}</span>
        <span class="text-muted-foreground"
          >{done ? '오늘 기록 저장됨' : '클릭만으로 작성해요'}</span
        >
      </div>
      <div class="h-2 overflow-hidden rounded-full bg-muted">
        <div
          class="h-full rounded-full bg-primary transition-all"
          style={`width: ${progressPercent}%`}
        ></div>
      </div>
    </div>

    {#if displayedPairs.length > 0}
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each displayedPairs as item}
          <div class="rounded-lg border bg-muted/30 p-3">
            <p class="text-[11px] tracking-wide text-muted-foreground uppercase">{item.label}</p>
            <p class="mt-1 text-sm leading-relaxed font-medium">{item.value}</p>
          </div>
        {/each}
      </div>
    {/if}

    {#if done}
      {#if completedReflection}
        <div class="grid gap-3 rounded-lg border bg-background p-4 sm:grid-cols-2">
          <div class="space-y-2">
            <p class="text-sm font-semibold">일기 요약</p>
            <p class="text-sm leading-relaxed text-muted-foreground">
              {completedReflection.summary}
            </p>
          </div>
          <div class="space-y-2">
            <p class="text-sm font-semibold">오늘의 조언</p>
            <p class="text-sm leading-relaxed text-muted-foreground">
              {completedReflection.advice}
            </p>
          </div>
        </div>
      {/if}

      <Button type="button" variant="secondary" onclick={startRewrite}>
        <RotateCcw />
        다시 쓰기
      </Button>
    {:else if currentNode}
      <div class="space-y-4">
        <div class="space-y-1">
          <p class="text-sm text-muted-foreground">{getEmotionQuestionGroupLabel(questionId)}</p>
          <h2 class="text-xl font-semibold tracking-tight">{currentNode.question}</h2>
        </div>

        <div class="grid gap-2 sm:grid-cols-2">
          {#each currentNode.choices as choice (choice.label)}
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              class="h-auto min-h-12 justify-start py-3 text-left whitespace-normal"
              onclick={() => pickChoice(questionId, choice.label)}
            >
              {choice.label}
            </Button>
          {/each}
        </div>

        {#if saving}
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle class="size-4 animate-spin" />
            저장하고 조언을 준비하는 중...
          </div>
        {/if}
      </div>
    {/if}
  </section>
</div>
