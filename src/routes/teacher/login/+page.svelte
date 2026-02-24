<script lang="ts">
  import LoaderCircle from '@lucide/svelte/icons/loader-circle'
  import { Alert, AlertDescription } from '$lib/components/ui/alert'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'

  import type { PageProps } from './$types'

  let { form }: PageProps = $props()
  let submitting = $state(false)
</script>

<svelte:head>
  <title>교사 로그인 | 감정일기</title>
</svelte:head>

<div class="mx-auto flex min-h-screen max-w-xl items-center px-6 py-10">
  <section class="w-full space-y-6">
    <div class="space-y-2">
      <p class="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">Teacher</p>
      <h1 class="text-2xl font-semibold tracking-tight">교사 대시보드 로그인</h1>
      <p class="text-muted-foreground text-sm">환경변수에 설정된 비밀번호로 로그인합니다.</p>
    </div>

    <form method="POST" class="space-y-4" onsubmit={() => (submitting = true)}>
      <div class="space-y-2">
        <Label for="teacher-password">비밀번호</Label>
        <Input id="teacher-password" type="password" name="password" class="h-11" disabled={submitting} required />
      </div>

      {#if form?.message}
        <Alert variant="destructive">
          <AlertDescription>{form.message}</AlertDescription>
        </Alert>
      {/if}

      <Button type="submit" class="h-11 w-full" disabled={submitting}>
        {#if submitting}
          <LoaderCircle class="size-4 animate-spin" />
          로그인 중...
        {:else}
          로그인
        {/if}
      </Button>
    </form>
  </section>
</div>
