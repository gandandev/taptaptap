<script lang="ts">
  import type { PageProps } from './$types'

  let { form }: PageProps = $props()
</script>

<svelte:head>
  <title>교사 로그인 | 감정일기</title>
</svelte:head>

<div class="mx-auto flex min-h-screen max-w-xl items-center px-6 py-10">
  <div class="w-full rounded-3xl border border-stone-200 bg-white p-7 shadow-sm">
    <p class="text-sm font-medium tracking-[0.2em] text-stone-400 uppercase">Teacher</p>
    <h1 class="mt-2 text-2xl font-semibold text-stone-900">교사 대시보드 로그인</h1>
    <p class="mt-2 text-sm text-stone-500">환경변수에 설정된 비밀번호로 로그인합니다.</p>

    <form method="POST" class="mt-6 space-y-3">
      <label class="block">
        <span class="mb-2 block text-sm font-medium text-stone-700">비밀번호</span>
        <input
          type="password"
          name="password"
          class="w-full rounded-2xl border border-stone-200 px-4 py-3 text-stone-900 outline-none focus:border-stone-400"
          required
        />
      </label>

      {#if form?.message}
        <p class="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{form.message}</p>
      {/if}

      <button
        type="submit"
        class="w-full cursor-pointer rounded-2xl bg-stone-900 px-4 py-3 font-medium text-white hover:bg-stone-800"
      >
        로그인
      </button>
    </form>
  </div>
</div>
