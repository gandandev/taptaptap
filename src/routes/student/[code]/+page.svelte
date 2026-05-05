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
  const initialReflection = untrack(() => data.savedReflection ?? null)

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
      completedReflection = payload.reflection ?? null
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

<div class="app-texture min-h-screen px-4 py-6 sm:px-6 lg:py-10">
  <section class="mx-auto max-w-4xl space-y-6">
    <div
      class="soft-panel flex flex-wrap items-start justify-between gap-4 rounded-[1.5rem] p-5 sm:p-6"
    >
      <div class="space-y-2">
        <Badge variant="secondary">감정일기</Badge>
        <h1 class="text-3xl font-semibold tracking-tight text-balance">
          {data.student.name}의 감정일기
        </h1>
        <p class="text-sm text-muted-foreground">오늘 날짜 (KST): {data.todayDate}</p>
      </div>
      <Button href="/" variant="outline" size="sm" class="rounded-xl bg-white/60">
        이름/PIN 다시 확인
      </Button>
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

    <div class="quiet-panel space-y-3 rounded-[1.25rem] p-4">
      <div class="flex items-center justify-between gap-3 text-sm">
        <span class="font-medium">{done ? '완료' : `${stepNumber}/6단계`}</span>
        <span class="text-muted-foreground"
          >{done ? '오늘 기록 저장됨' : '클릭만으로 작성해요'}</span
        >
      </div>
      <div class="h-3 overflow-hidden rounded-full bg-muted">
        <div
          class="h-full rounded-full bg-primary transition-all duration-300"
          style={`width: ${progressPercent}%`}
        ></div>
      </div>
    </div>

    {#if displayedPairs.length > 0}
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each displayedPairs as item (item.label)}
          <div class="quiet-panel rounded-2xl p-4">
            <p class="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              {item.label}
            </p>
            <p class="mt-1 text-sm leading-relaxed font-medium">{item.value}</p>
          </div>
        {/each}
      </div>
    {/if}

    {#if saving && displayedPairs.length >= 6}
      <div class="grid gap-4 sm:grid-cols-2" aria-label="조언 분석 중">
        <div class="quiet-panel space-y-3 rounded-2xl p-4">
          <div class="skeleton-shimmer h-4 w-20 rounded-full"></div>
          <div class="space-y-2">
            <div class="skeleton-shimmer h-4 w-full rounded-full"></div>
            <div class="skeleton-shimmer h-4 w-11/12 rounded-full"></div>
            <div class="skeleton-shimmer h-4 w-7/12 rounded-full"></div>
          </div>
        </div>
        <div class="quiet-panel space-y-3 rounded-2xl p-4">
          <div class="skeleton-shimmer h-4 w-20 rounded-full"></div>
          <div class="space-y-2">
            <div class="skeleton-shimmer h-4 w-full rounded-full"></div>
            <div class="skeleton-shimmer h-4 w-10/12 rounded-full"></div>
            <div class="skeleton-shimmer h-4 w-8/12 rounded-full"></div>
          </div>
        </div>
      </div>
    {/if}

    {#if done}
      {#if completedReflection}
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="quiet-panel space-y-2 rounded-2xl p-4">
            <p class="text-sm font-semibold text-primary">일기 요약</p>
            <p class="text-sm leading-relaxed text-muted-foreground">
              {completedReflection.summary}
            </p>
          </div>
          <div class="quiet-panel space-y-2 rounded-2xl p-4">
            <p class="text-sm font-semibold text-primary">오늘의 조언</p>
            <p class="text-sm leading-relaxed text-muted-foreground">
              {completedReflection.advice}
            </p>
          </div>
        </div>
      {/if}

      <Button
        type="button"
        variant="secondary"
        class="choice-button rounded-xl"
        onclick={startRewrite}
      >
        <RotateCcw />
        다시 쓰기
      </Button>
    {:else if currentNode}
      <div class="soft-panel space-y-6 rounded-[1.5rem] p-5 sm:p-7">
        <div class="space-y-1">
          <p class="text-sm font-semibold text-primary">
            {getEmotionQuestionGroupLabel(questionId)}
          </p>
          <h2 class="text-2xl leading-tight font-semibold tracking-tight text-balance">
            {currentNode.question}
          </h2>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          {#each currentNode.choices as choice (choice.label)}
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              class="choice-button h-auto min-h-14 justify-start rounded-2xl bg-white/70 px-4 py-4 text-left leading-relaxed whitespace-normal hover:bg-secondary"
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
