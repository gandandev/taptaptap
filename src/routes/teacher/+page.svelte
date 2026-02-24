<script lang="ts">
  import type { PageProps } from './$types'

  let { data, form }: PageProps = $props()
</script>

<svelte:head>
  <title>교사 대시보드 | 감정일기</title>
</svelte:head>

<div class="grid gap-6 lg:grid-cols-[360px_1fr]">
  <section class="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
    <h2 class="text-lg font-semibold text-stone-900">학생 등록</h2>
    <p class="mt-1 text-sm text-stone-500">이름을 입력하면 6자리 학생 코드가 자동 생성됩니다.</p>

    <form method="POST" class="mt-4 space-y-3">
      <label class="block">
        <span class="mb-2 block text-sm font-medium text-stone-700">학생 이름</span>
        <input
          type="text"
          name="name"
          placeholder="예: 김민지"
          class="w-full rounded-xl border border-stone-200 px-4 py-3 text-stone-900 outline-none focus:border-stone-400"
          required
        />
      </label>

      {#if form?.message}
        <p
          class="rounded-xl px-3 py-2 text-sm {form.createdStudent
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-rose-50 text-rose-700'}"
        >
          {form.message}
        </p>
      {/if}

      <button
        type="submit"
        class="w-full cursor-pointer rounded-xl bg-stone-900 px-4 py-3 font-medium text-white hover:bg-stone-800"
      >
        학생 추가
      </button>
    </form>
  </section>

  <section class="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 class="text-lg font-semibold text-stone-900">오늘 제출 현황</h2>
        <p class="text-sm text-stone-500">기준 날짜 (KST): {data.todayDate}</p>
      </div>
      <span class="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-600">
        총 {data.students.length}명
      </span>
    </div>

    <div class="mt-4 overflow-x-auto">
      <table class="min-w-full text-left text-sm">
        <thead>
          <tr class="border-b border-stone-100 text-stone-500">
            <th class="px-2 py-2 font-medium">학생</th>
            <th class="px-2 py-2 font-medium">코드</th>
            <th class="px-2 py-2 font-medium">제출</th>
            <th class="px-2 py-2 font-medium">감정</th>
            <th class="px-2 py-2 font-medium">이유/메모</th>
          </tr>
        </thead>
        <tbody>
          {#if data.students.length === 0}
            <tr>
              <td colspan="5" class="px-2 py-6 text-center text-stone-400">등록된 학생이 없어요.</td>
            </tr>
          {:else}
            {#each data.students as student}
              <tr class="border-b border-stone-50 align-top">
                <td class="px-2 py-3">
                  <a
                    href={`/teacher/students/${student.studentId}`}
                    class="font-medium text-stone-900 underline-offset-4 hover:underline"
                  >
                    {student.name}
                  </a>
                </td>
                <td class="px-2 py-3 font-mono text-stone-600">{student.code}</td>
                <td class="px-2 py-3">
                  {#if student.hasSubmittedToday}
                    <span class="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                      제출함
                    </span>
                  {:else}
                    <span class="rounded-full bg-stone-100 px-2 py-1 text-xs font-medium text-stone-500">
                      미제출
                    </span>
                  {/if}
                </td>
                <td class="px-2 py-3">
                  {#if student.moodPrimary}
                    <span
                      class="rounded-full px-2 py-1 text-xs font-medium {student.moodPrimary === '안 좋아...'
                        ? 'bg-rose-100 text-rose-700'
                        : student.moodPrimary === '좋아!'
                          ? 'bg-sky-100 text-sky-700'
                          : 'bg-amber-100 text-amber-700'}"
                    >
                      {student.moodPrimary}
                    </span>
                  {:else}
                    <span class="text-stone-400">-</span>
                  {/if}
                </td>
                <td class="px-2 py-3 text-stone-600">
                  {#if student.badReasonSummary}
                    {student.badReasonSummary}
                  {:else if student.hasSubmittedToday}
                    <span class="text-stone-400">(없음)</span>
                  {:else}
                    <span class="text-stone-300">-</span>
                  {/if}
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </section>
</div>
