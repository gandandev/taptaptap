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

<div class="flex min-h-screen items-center justify-center px-5 py-10">
  <form method="POST" class="w-full max-w-sm space-y-5" onsubmit={() => (submitting = true)}>
    <h1 class="text-2xl font-semibold tracking-tight">교사 로그인</h1>

    <div class="space-y-2">
      <Label for="teacher-password">비밀번호</Label>
      <Input
        id="teacher-password"
        type="password"
        name="password"
        class="h-12 rounded-lg bg-white/70"
        required
      />
    </div>

    {#if form?.message}
      <Alert variant="destructive">
        <AlertDescription>{form.message}</AlertDescription>
      </Alert>
    {/if}

    <Button type="submit" class="choice-button h-12 w-full rounded-lg" disabled={submitting}>
      {#if submitting}
        <LoaderCircle class="size-4 animate-spin" />
        로그인 중...
      {:else}
        로그인
      {/if}
    </Button>
  </form>
</div>
