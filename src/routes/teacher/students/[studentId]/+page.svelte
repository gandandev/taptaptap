<script lang="ts">
  import { EMOTION_TREE } from '$lib/shared/emotion-tree'

  import type { PageProps } from './$types'

  let { data }: PageProps = $props()
</script>

<svelte:head>
  <title>{data.student.name} | 학생 감정일기 이력</title>
</svelte:head>

<div class="space-y-4">
  <div class="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
    <a href="/teacher" class="text-sm text-stone-500 underline underline-offset-4 hover:text-stone-700">
      ← 오늘 목록으로
    </a>
    <h2 class="mt-3 text-2xl font-semibold text-stone-900">{data.student.name}</h2>
    <p class="mt-1 text-sm text-stone-500">학생 코드 {data.student.code}</p>
  </div>

  {#if data.entries.length === 0}
    <div class="rounded-2xl border border-stone-200 bg-white p-6 text-stone-500 shadow-sm">
      아직 제출된 감정일기가 없어요.
    </div>
  {:else}
    {#each data.entries as entry}
      <section class="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="text-lg font-semibold text-stone-900">{entry.entryDate}</h3>
          <span
            class="rounded-full px-2 py-1 text-xs font-medium {entry.moodPrimary === '안 좋아...'
              ? 'bg-rose-100 text-rose-700'
              : entry.moodPrimary === '좋아!'
                ? 'bg-sky-100 text-sky-700'
                : 'bg-amber-100 text-amber-700'}"
          >
            {entry.moodPrimary}
          </span>
        </div>

        <div class="mt-4 space-y-4">
          {#each entry.answers as answer, i (`${entry.id}-${answer.questionId}-${i}`)}
            <div class="rounded-xl bg-stone-50 p-3">
              <p class="text-xs tracking-wide text-stone-400 uppercase">
                {EMOTION_TREE[answer.questionId]?.question ?? answer.questionId}
              </p>
              <p class="mt-1 text-stone-700">{answer.answer}</p>
            </div>
          {/each}
        </div>
      </section>
    {/each}
  {/if}
</div>
