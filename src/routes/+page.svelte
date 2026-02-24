<script lang="ts">
  import type { PageProps } from './$types'

  let { data, form }: PageProps = $props()

  let errorMessage = $derived(form?.message ?? data.errorMessage)
  let codeValue = $derived(form?.code ?? '')
</script>

<svelte:head>
  <title>감정일기 | 학생 코드 입력</title>
</svelte:head>

<div class="mx-auto flex min-h-screen max-w-xl items-center px-6 py-10">
  <div class="w-full rounded-3xl border border-stone-200 bg-white p-7 shadow-sm">
    <p class="text-sm font-medium tracking-[0.2em] text-stone-400 uppercase">TapTapTap</p>
    <h1 class="mt-3 text-3xl font-semibold text-stone-900">감정일기 시작하기</h1>
    <p class="mt-2 text-stone-500">선생님이 알려준 6자리 학생 코드를 입력해 주세요.</p>

    <form method="POST" class="mt-6 space-y-3">
      <label class="block">
        <span class="mb-2 block text-sm font-medium text-stone-700">학생 코드</span>
        <input
          name="code"
          type="text"
          inputmode="numeric"
          pattern="[0-9]{6}"
          maxlength="6"
          value={codeValue}
          placeholder="예: 012345"
          class="w-full rounded-2xl border border-stone-200 px-4 py-3 text-lg tracking-[0.2em] text-stone-900 outline-none placeholder:tracking-normal placeholder:text-stone-300 focus:border-stone-400"
          required
        />
      </label>

      {#if errorMessage}
        <p class="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
      {/if}

      <button
        type="submit"
        class="w-full cursor-pointer rounded-2xl bg-stone-900 px-4 py-3 font-medium text-white duration-100 hover:bg-stone-800 active:scale-[0.99]"
      >
        감정일기 쓰러 가기
      </button>
    </form>

    <div class="mt-6 border-t border-stone-100 pt-4">
      <a class="text-sm text-stone-500 underline underline-offset-4 hover:text-stone-700" href="/teacher/login">
        교사 대시보드 로그인
      </a>
    </div>
  </div>
</div>
