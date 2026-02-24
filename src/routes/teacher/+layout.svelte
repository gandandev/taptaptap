<script lang="ts">
  import { Button } from '$lib/components/ui/button'

  import type { LayoutProps } from './$types'

  let { data, children }: LayoutProps = $props()
</script>

{#if data.isLoginPage}
  {@render children()}
{:else}
  <div class="bg-background min-h-screen">
    <header class="bg-background border-b">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div>
          <p class="text-muted-foreground text-xs tracking-[0.18em] uppercase">Teacher Dashboard</p>
          <h1 class="text-lg font-semibold">감정일기 교사 대시보드</h1>
        </div>
        <div class="flex items-center gap-2">
          <Button href="/teacher" variant="ghost" size="sm">오늘 목록</Button>
          <form method="POST" action="/teacher/logout">
            <Button type="submit" variant="outline" size="sm">로그아웃</Button>
          </form>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-6">
      {@render children()}
    </main>
  </div>
{/if}
