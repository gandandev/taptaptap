<script lang="ts">
  import type { LayoutProps } from './$types'

  let { data, children }: LayoutProps = $props()
</script>

{#if data.isLoginPage}
  {@render children()}
{:else}
  <div class="min-h-screen bg-stone-50">
    <header class="border-b border-stone-200 bg-white">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div>
          <p class="text-xs tracking-[0.18em] text-stone-400 uppercase">Teacher Dashboard</p>
          <h1 class="text-lg font-semibold text-stone-900">감정일기 교사 대시보드</h1>
        </div>
        <div class="flex items-center gap-2">
          <a href="/teacher" class="rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-100">오늘 목록</a>
          <form method="POST" action="/teacher/logout">
            <button
              type="submit"
              class="cursor-pointer rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-600 hover:bg-stone-100"
            >
              로그아웃
            </button>
          </form>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-6">
      {@render children()}
    </main>
  </div>
{/if}
