<script lang="ts">
  import LoaderCircle from '@lucide/svelte/icons/loader-circle'
  import { Button } from '$lib/components/ui/button'

  import type { LayoutProps } from './$types'

  let { data, children }: LayoutProps = $props()
  let loggingOut = $state(false)
</script>

{#if data.isLoginPage}
  {@render children()}
{:else}
  <div class="app-texture min-h-screen">
    <header class="sticky top-0 z-10 bg-background">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-6">
        <div>
          <h1 class="text-lg font-semibold tracking-tight">감정일기 교사 대시보드</h1>
        </div>
        <div class="flex items-center gap-2">
          <form method="POST" action="/teacher/logout" onsubmit={() => (loggingOut = true)}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              class="rounded-xl bg-transparent"
              disabled={loggingOut}
            >
              {#if loggingOut}
                <LoaderCircle class="size-4 animate-spin" />
                로그아웃 중...
              {:else}
                로그아웃
              {/if}
            </Button>
          </form>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-5 py-5 sm:px-6 sm:py-6">
      {@render children()}
    </main>
  </div>
{/if}
