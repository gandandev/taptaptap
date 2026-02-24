<script lang="ts">
  import { onMount } from 'svelte'
  import { HugeiconsIcon } from '@hugeicons/svelte'
  import { Calendar04Icon } from '@hugeicons/core-free-icons'

  // -- Decision Tree --

  type QuestionNode = {
    question: string
    choices: { label: string; nextId: string | null }[]
    freeTextNext: string | null
  }

  const tree: Record<string, QuestionNode> = {
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

  // -- Date Utilities --

  function getMonday(d: Date): Date {
    const date = new Date(d)
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1)
    date.setDate(diff)
    date.setHours(0, 0, 0, 0)
    return date
  }

  function dateKey(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
  }

  function sameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    )
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monday = getMonday(today)
  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
  const dayLabels = ['월', '화', '수', '목', '금']

  // -- State --

  type Answer = { questionId: string; answer: string }
  type Entry = { answers: Answer[] }

  let selectedIdx = $state(
    Math.max(
      0,
      weekDays.findIndex((d) => sameDay(d, today))
    )
  )
  let answers: Answer[] = $state([])
  let questionId = $state('mood')
  let freeText = $state('')
  let savedEntry: Entry | null = $state(null)
  let done = $state(false)
  let mounted = $state(false)

  let isSelectedToday = $derived(sameDay(weekDays[selectedIdx], today))

  // -- Storage --

  function loadEntry(key: string): Entry | null {
    try {
      const raw = localStorage.getItem(`diary-${key}`)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  function saveEntry(key: string, entry: Entry) {
    try {
      localStorage.setItem(`diary-${key}`, JSON.stringify(entry))
    } catch {
      /* noop */
    }
  }

  // -- Actions --

  function openDay(idx: number) {
    selectedIdx = idx
    freeText = ''
    done = false
    answers = []
    questionId = 'mood'

    const key = dateKey(weekDays[idx])
    const saved = loadEntry(key)
    savedEntry = saved

    if (sameDay(weekDays[idx], today) && saved) {
      done = true
      answers = saved.answers
    }
  }

  function pickChoice(qId: string, label: string, nextId: string | null) {
    answers = [...answers, { questionId: qId, answer: label }]
    if (nextId) {
      questionId = nextId
    } else {
      finish()
    }
  }

  function submitText(qId: string) {
    if (!freeText.trim()) return
    const node = tree[qId]
    answers = [...answers, { questionId: qId, answer: freeText.trim() }]
    freeText = ''
    if (node.freeTextNext) {
      questionId = node.freeTextNext
    } else {
      finish()
    }
  }

  function finish() {
    const entry: Entry = { answers }
    saveEntry(dateKey(weekDays[selectedIdx]), entry)
    savedEntry = entry
    done = true
  }

  function rewrite() {
    done = false
    answers = []
    questionId = 'mood'
    freeText = ''
    savedEntry = null
    try {
      localStorage.removeItem(`diary-${dateKey(weekDays[selectedIdx])}`)
    } catch {
      /* noop */
    }
  }

  onMount(() => {
    mounted = true
    openDay(selectedIdx)
  })
</script>

<div class="mx-auto max-w-3xl">
  <div class="flex px-4 pt-2">
    {#each weekDays as day, i (i)}
      {@const isDayToday = sameDay(day, today)}
      {@const isSelected = selectedIdx === i}
      <button
        class="flex flex-1 cursor-pointer flex-col items-center rounded-xl p-2 text-center duration-75 select-none active:scale-95 active:bg-stone-200
          {isSelected ? 'bg-stone-100' : 'hover:bg-stone-100'}"
        onclick={() => openDay(i)}
      >
        <span
          class="text-xl font-semibold {isDayToday
            ? 'text-red-500'
            : isSelected
              ? 'text-stone-900'
              : 'text-stone-500'}"
        >
          {day.getDate()}
        </span>
        <span class={isDayToday ? 'text-red-400' : isSelected ? 'text-stone-500' : 'text-stone-400'}
          >{dayLabels[i]}</span
        >
      </button>
    {/each}
    <button
      class="flex flex-1 cursor-pointer items-center justify-center rounded-xl p-3 duration-75 select-none hover:bg-stone-100 active:scale-95 active:bg-stone-200"
    >
      <HugeiconsIcon class="text-stone-500" icon={Calendar04Icon} strokeWidth={2} />
    </button>
  </div>

  {#if mounted}
    <div class="px-6 pt-6">
      {#if isSelectedToday && !done}
        {#each answers as a (a.questionId)}
          <div class="mb-3">
            <p class="text-sm text-stone-400">{tree[a.questionId].question}</p>
            <p class="text-stone-600">{a.answer}</p>
          </div>
        {/each}

        {@const node = tree[questionId]}
        <p class="mb-3 text-lg font-medium text-stone-800">{node.question}</p>

        {#if node.choices.length > 0}
          <div class="flex flex-wrap gap-2">
            {#each node.choices as choice (choice.label)}
              <button
                class="cursor-pointer rounded-xl px-4 py-2 text-stone-600 duration-75 select-none hover:bg-stone-100 active:scale-95 active:bg-stone-200"
                onclick={() => pickChoice(questionId, choice.label, choice.nextId)}
              >
                {choice.label}
              </button>
            {/each}
          </div>
        {/if}

        <div class="mt-3 flex gap-2">
          <input
            type="text"
            bind:value={freeText}
            placeholder={questionId === 'final' ? '자유롭게 써봐!' : '직접 써볼래?'}
            class="flex-1 rounded-xl border border-stone-200 px-4 py-2 text-stone-700 outline-none placeholder:text-stone-300 focus:border-stone-400"
            onkeydown={(e) => {
              if (e.key === 'Enter') submitText(questionId)
            }}
          />
          <button
            class="cursor-pointer rounded-xl px-4 py-2 text-stone-500 duration-75 select-none hover:bg-stone-100 active:scale-95 active:bg-stone-200"
            onclick={() => submitText(questionId)}
          >
            확인
          </button>
        </div>

        {#if questionId === 'final'}
          <button
            class="mt-2 cursor-pointer rounded-xl px-4 py-2 text-stone-400 duration-75 select-none hover:bg-stone-100 active:scale-95 active:bg-stone-200"
            onclick={finish}
          >
            넘어가기
          </button>
        {/if}
      {:else if isSelectedToday && done && savedEntry}
        {#each savedEntry.answers as a (a.questionId)}
          <div class="mb-3">
            <p class="text-sm text-stone-400">{tree[a.questionId].question}</p>
            <p class="text-stone-700">{a.answer}</p>
          </div>
        {/each}
        <button
          class="mt-2 cursor-pointer rounded-xl px-4 py-2 text-stone-400 duration-75 select-none hover:bg-stone-100 active:scale-95 active:bg-stone-200"
          onclick={rewrite}
        >
          다시 쓰기
        </button>
      {:else if !isSelectedToday && savedEntry}
        {#each savedEntry.answers as a (a.questionId)}
          <div class="mb-3">
            <p class="text-sm text-stone-400">{tree[a.questionId].question}</p>
            <p class="text-stone-700">{a.answer}</p>
          </div>
        {/each}
      {:else}
        <p class="text-stone-400">기록이 없어요</p>
      {/if}
    </div>
  {/if}
</div>
