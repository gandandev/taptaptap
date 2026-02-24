<script lang="ts">
  import LoaderCircle from '@lucide/svelte/icons/loader-circle'
  import { untrack } from 'svelte'

  import { Alert, AlertDescription } from '$lib/components/ui/alert'
  import { Badge } from '$lib/components/ui/badge'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { EMOTION_TREE, EMOTION_TREE_START_ID } from '$lib/shared/emotion-tree'
  import type { EmotionAnswer } from '$lib/shared/emotion-types'

  import type { PageProps } from './$types'

  let { data }: PageProps = $props()
  const initialSavedAnswers = untrack(() => data.savedEntry?.answers ?? [])
  const hasInitialSavedEntry = untrack(() => Boolean(data.savedEntry))

  let answers: EmotionAnswer[] = $state([])
  let completedAnswers: EmotionAnswer[] = $state(initialSavedAnswers)
  let questionId = $state(EMOTION_TREE_START_ID)
  let freeText = $state('')
  let done = $state(hasInitialSavedEntry)
  let saving = $state(false)
  let errorMessage = $state('')
  let successMessage = $state('')

  let currentNode = $derived(EMOTION_TREE[questionId])
  let displayedAnswers = $derived(done ? completedAnswers : answers)
  let isFinalQuestion = $derived(questionId === 'final')

  function resetDraft() {
    answers = []
    questionId = EMOTION_TREE_START_ID
    freeText = ''
    errorMessage = ''
    successMessage = ''
  }

  function startRewrite() {
    done = false
    resetDraft()
  }

  function pickChoice(qId: string, label: string, nextId: string | null) {
    if (saving) return

    answers = [
      ...answers,
      {
        questionId: qId,
        answer: label,
        answerType: 'choice'
      }
    ]

    if (nextId) {
      questionId = nextId
      return
    }

    void finish()
  }

  function submitText(qId: string) {
    if (saving) return

    const value = freeText.trim()

    if (!value) return

    const node = EMOTION_TREE[qId]

    answers = [
      ...answers,
      {
        questionId: qId,
        answer: value,
        answerType: 'text'
      }
    ]

    freeText = ''

    if (node.freeTextNext) {
      questionId = node.freeTextNext
      return
    }

    void finish()
  }

  async function finish() {
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
        body: JSON.stringify({ answers })
      })

      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null

      if (!response.ok || !payload?.ok) {
        errorMessage = payload?.error ?? '저장에 실패했어요. 다시 시도해 주세요.'
        return
      }

      completedAnswers = [...answers]
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

<div class="mx-auto max-w-3xl px-4 py-6">
  <section class="space-y-5">
    <div class="flex flex-wrap items-start justify-between gap-3 pb-5">
      <div class="space-y-2">
        <Badge variant="outline" class="font-mono">학생 코드 {data.student.code}</Badge>
        <h1 class="text-2xl font-semibold tracking-tight">{data.student.name}의 감정일기</h1>
        <p class="text-muted-foreground text-sm">오늘 날짜 (KST): {data.todayDate}</p>
      </div>
      <Button href="/" variant="outline" size="sm">코드 다시 입력</Button>
    </div>

    {#if successMessage}
      <Alert>
        <AlertDescription>{successMessage}</AlertDescription>
      </Alert>
    {/if}

    {#if errorMessage}
      <Alert variant="destructive">
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
    {/if}

    {#if displayedAnswers.length > 0}
      <div class="bg-muted/40 rounded-lg border p-4">
        <div class="space-y-4">
          {#each displayedAnswers as answer, i (`${answer.questionId}-${i}`)}
            <div class="space-y-1">
              <p class="text-muted-foreground text-[11px] tracking-wide uppercase">
                {EMOTION_TREE[answer.questionId]?.question ?? answer.questionId}
              </p>
              <p class="text-sm leading-relaxed">{answer.answer}</p>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if done}
      <div class="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onclick={startRewrite}>다시 쓰기</Button>
      </div>
    {:else}
      <div class="space-y-4">
        <div>
          <p class="text-lg font-medium">{currentNode.question}</p>
        </div>

        {#if currentNode.choices.length > 0}
          <div class="flex flex-wrap gap-2">
            {#each currentNode.choices as choice (choice.label)}
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                class="h-auto py-2 text-left whitespace-normal"
                onclick={() => pickChoice(questionId, choice.label, choice.nextId)}
              >
                {choice.label}
              </Button>
            {/each}
          </div>
        {/if}

        <div class="flex flex-col gap-2 sm:flex-row">
          <Input
            type="text"
            bind:value={freeText}
            placeholder={isFinalQuestion ? '오늘 하고 싶은 말을 자유롭게 써도 돼' : '직접 써도 돼요'}
            class="h-10 flex-1"
            disabled={saving}
            onkeydown={(event) => {
              if (event.key === 'Enter') {
                submitText(questionId)
              }
            }}
          />
          <Button type="button" variant="outline" disabled={saving} onclick={() => submitText(questionId)}>
            텍스트로 답하기
          </Button>
        </div>

        {#if isFinalQuestion}
          <Button type="button" disabled={saving} onclick={() => void finish()}>
            {#if saving}
              <LoaderCircle class="size-4 animate-spin" />
              저장 중...
            {:else}
              오늘 감정일기 저장
            {/if}
          </Button>
        {/if}
      </div>
    {/if}
  </section>
</div>
