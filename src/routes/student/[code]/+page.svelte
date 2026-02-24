<script lang="ts">
  import { untrack } from 'svelte'

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

    if (!value) {
      return
    }

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
        body: JSON.stringify({
          answers
        })
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
  <div class="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-sm text-stone-400">학생 코드 {data.student.code}</p>
        <h1 class="text-2xl font-semibold text-stone-900">{data.student.name}의 감정일기</h1>
        <p class="mt-1 text-sm text-stone-500">오늘 날짜: {data.todayDate}</p>
      </div>
      <a
        href="/"
        class="rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50"
      >
        코드 다시 입력
      </a>
    </div>

    {#if successMessage}
      <p class="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</p>
    {/if}

    {#if errorMessage}
      <p class="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
    {/if}

    <div class="mt-6 rounded-2xl bg-stone-50 p-4">
      {#if displayedAnswers.length > 0}
        <div class="space-y-4">
          {#each displayedAnswers as answer, i (`${answer.questionId}-${i}`)}
            <div>
              <p class="text-xs tracking-wide text-stone-400 uppercase">
                {EMOTION_TREE[answer.questionId]?.question ?? answer.questionId}
              </p>
              <p class="mt-1 text-stone-700">{answer.answer}</p>
            </div>
          {/each}
        </div>
      {:else}
        <p class="text-sm text-stone-500">아직 작성한 답변이 없어요.</p>
      {/if}
    </div>

    {#if done}
      <div class="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          class="cursor-pointer rounded-xl bg-stone-900 px-4 py-2 text-white duration-100 hover:bg-stone-800"
          onclick={startRewrite}
        >
          다시 쓰기
        </button>
      </div>
    {:else}
      <div class="mt-6">
        <p class="mb-3 text-lg font-medium text-stone-900">{currentNode.question}</p>

        {#if currentNode.choices.length > 0}
          <div class="flex flex-wrap gap-2">
            {#each currentNode.choices as choice (choice.label)}
              <button
                type="button"
                disabled={saving}
                class="cursor-pointer rounded-xl border border-stone-200 bg-white px-4 py-2 text-stone-700 duration-100 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                onclick={() => pickChoice(questionId, choice.label, choice.nextId)}
              >
                {choice.label}
              </button>
            {/each}
          </div>
        {/if}

        <div class="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            bind:value={freeText}
            placeholder={isFinalQuestion ? '오늘 하고 싶은 말을 자유롭게 써도 돼' : '직접 써도 돼요'}
            class="flex-1 rounded-xl border border-stone-200 px-4 py-3 text-stone-700 outline-none placeholder:text-stone-300 focus:border-stone-400"
            disabled={saving}
            onkeydown={(event) => {
              if (event.key === 'Enter') {
                submitText(questionId)
              }
            }}
          />
          <button
            type="button"
            class="cursor-pointer rounded-xl border border-stone-200 px-4 py-3 text-stone-600 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={saving}
            onclick={() => submitText(questionId)}
          >
            텍스트로 답하기
          </button>
        </div>

        {#if isFinalQuestion}
          <button
            type="button"
            class="mt-3 cursor-pointer rounded-xl bg-stone-900 px-4 py-3 font-medium text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={saving}
            onclick={() => void finish()}
          >
            {saving ? '저장 중...' : '오늘 감정일기 저장'}
          </button>
        {/if}
      </div>
    {/if}
  </div>
</div>
