<script lang="ts">
  import LoaderCircle from '@lucide/svelte/icons/loader-circle'
  import { untrack } from 'svelte'

  import { Alert, AlertDescription } from '$lib/components/ui/alert'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'

  import type { PageProps } from './$types'

  let { data, form }: PageProps = $props()

  const initialNameText = untrack(() =>
    form && 'name' in form && typeof form.name === 'string' ? form.name : ''
  )

  let studentName = $state(initialNameText)
  let pin = $state('')
  let loggingIn = $state(false)
  let loginMessage = $derived(form?.message ?? data.errorMessage)
  let isPinMismatchMessage = $derived(loginMessage === '이름과 PIN이 일치하지 않아요.')
  let isLoginReady = $derived(studentName.trim().length > 0 && pin.replace(/\D/g, '').length === 4)

  function fourDigits(rawValue: string) {
    return rawValue.replace(/\D/g, '').slice(0, 4)
  }
</script>

<svelte:head>
  <title>감정일기 | 학생 확인</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center px-5 py-10">
  <form
    method="POST"
    action="?/login"
    class="w-full max-w-sm space-y-5"
    onsubmit={() => (loggingIn = true)}
  >
    <div class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight">감정일기</h1>
      <p class="text-sm text-muted-foreground">이름과 비밀번호를 입력해 주세요.</p>
    </div>

    <div class="space-y-2">
      <Label for="student-name">이름</Label>
      <Input
        id="student-name"
        name="name"
        type="text"
        bind:value={studentName}
        class="h-12 rounded-lg bg-white/70"
        maxlength={40}
        autocomplete="name"
        readonly={loggingIn}
        aria-disabled={loggingIn}
        required
        oninput={() => (loggingIn = false)}
      />
    </div>

    <div class="space-y-2">
      <Label for="student-pin">비밀번호</Label>
      <Input
        id="student-pin"
        name="pin"
        type="password"
        inputmode="numeric"
        pattern="[0-9]*"
        maxlength={4}
        bind:value={pin}
        class="h-12 rounded-lg bg-white/70 text-lg font-semibold tracking-[0.38em]"
        autocomplete="current-password"
        readonly={loggingIn}
        aria-disabled={loggingIn}
        required
        oninput={(event) => {
          pin = fourDigits((event.currentTarget as HTMLInputElement).value)
          loggingIn = false
        }}
      />
    </div>

    {#if loginMessage}
      {#if isPinMismatchMessage}
        <p class="text-sm font-medium text-destructive" role="alert">{loginMessage}</p>
      {:else}
        <Alert variant="destructive">
          <AlertDescription>{loginMessage}</AlertDescription>
        </Alert>
      {/if}
    {/if}

    <Button
      type="submit"
      class="choice-button h-12 w-full rounded-lg text-base shadow-none"
      disabled={loggingIn || !isLoginReady}
    >
      {#if loggingIn}
        <LoaderCircle class="size-4 animate-spin" />
        확인 중...
      {:else}
        들어가기
      {/if}
    </Button>

    <Button
      href="/teacher/login"
      variant="ghost"
      size="sm"
      class="mx-auto flex w-fit text-xs text-muted-foreground"
    >
      교사 로그인
    </Button>
  </form>
</div>
