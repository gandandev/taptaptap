<script lang="ts">
  import LoaderCircle from '@lucide/svelte/icons/loader-circle'
  import { untrack } from 'svelte'

  import { Alert, AlertDescription } from '$lib/components/ui/alert'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'

  import type { PageProps } from './$types'

  let { data, form }: PageProps = $props()

  const CODE_LENGTH = 6
  const initialCodeText = untrack(() => String(form?.code ?? ''))

  let errorMessage = $derived(form?.message ?? data.errorMessage)
  let codeDigits = $state(
    Array.from({ length: CODE_LENGTH }, (_, index) => initialCodeText[index]?.replace(/\D/g, '') ?? '')
  )
  let joinedCode = $derived(codeDigits.join(''))
  let isCodeComplete = $derived(joinedCode.length === CODE_LENGTH)
  let submitting = $state(false)

  function focusDigit(index: number) {
    const target = document.getElementById(`student-code-${index}`) as HTMLInputElement | null
    target?.focus()
    target?.select()
  }

  function setDigit(index: number, digit: string) {
    const next = [...codeDigits]
    next[index] = digit
    codeDigits = next
    submitting = false
  }

  function fillDigitsFrom(index: number, rawValue: string) {
    const digits = rawValue.replace(/\D/g, '')

    if (!digits) {
      setDigit(index, '')
      return
    }

    const next = [...codeDigits]
    let cursor = index

    for (const digit of digits) {
      if (cursor >= CODE_LENGTH) break
      next[cursor] = digit
      cursor += 1
    }

    codeDigits = next
    submitting = false

    focusDigit(Math.min(cursor, CODE_LENGTH - 1))
  }

  function handleDigitInput(index: number, event: Event) {
    const target = event.currentTarget as HTMLInputElement
    const value = target.value.replace(/\D/g, '')

    if (!value) {
      setDigit(index, '')
      return
    }

    if (value.length > 1) {
      fillDigitsFrom(index, value)
      return
    }

    setDigit(index, value)

    if (index < CODE_LENGTH - 1) {
      focusDigit(index + 1)
    }
  }

  function handleDigitKeydown(index: number, event: KeyboardEvent) {
    if (event.key === 'Backspace') {
      if (codeDigits[index]) {
        event.preventDefault()
        setDigit(index, '')
        return
      }

      if (index > 0) {
        event.preventDefault()
        setDigit(index - 1, '')
        focusDigit(index - 1)
      }
      return
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      focusDigit(index - 1)
      return
    }

    if (event.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      event.preventDefault()
      focusDigit(index + 1)
    }
  }

  function handleDigitPaste(index: number, event: ClipboardEvent) {
    event.preventDefault()
    fillDigitsFrom(index, event.clipboardData?.getData('text') ?? '')
  }
</script>

<svelte:head>
  <title>감정일기 | 학생 코드 입력</title>
</svelte:head>

<div class="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-12">
  <section class="w-full space-y-10">
    <div class="space-y-3">
      <p class="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">TapTapTap</p>
      <h1 class="text-4xl font-semibold tracking-tight sm:text-5xl">감정일기 시작하기</h1>
      <p class="text-muted-foreground text-lg">선생님이 알려준 6자리 학생 코드를 입력해 주세요.</p>
    </div>

    <form method="POST" class="space-y-5" onsubmit={() => (submitting = true)}>
      <div class="space-y-3">
        <Label for="student-code-0" class="text-base">학생 코드</Label>
        <input type="hidden" name="code" value={joinedCode} />

        <div class="flex flex-wrap items-center gap-2 sm:gap-3">
          {#each codeDigits as digit, index (index)}
            <Input
              id={`student-code-${index}`}
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength={1}
              value={digit}
              class="h-16 w-12 rounded-xl text-center text-2xl font-semibold sm:w-14 sm:text-3xl"
              aria-label={`학생 코드 ${index + 1}번째 숫자`}
              autocomplete="one-time-code"
              disabled={submitting}
              onfocus={(event) => (event.currentTarget as HTMLInputElement).select()}
              oninput={(event) => handleDigitInput(index, event)}
              onkeydown={(event) => handleDigitKeydown(index, event)}
              onpaste={(event) => handleDigitPaste(index, event)}
              required={index === 0}
            />
          {/each}
        </div>
        <p class="text-muted-foreground text-xs">6자리 숫자를 순서대로 입력해 주세요.</p>
      </div>

      {#if errorMessage}
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      {/if}

      <Button
        type="submit"
        class="h-12 w-full rounded-xl text-base sm:w-auto sm:min-w-64"
        disabled={submitting || !isCodeComplete}
      >
        {#if submitting}
          <LoaderCircle class="size-4 animate-spin" />
          확인 중...
        {:else}
          감정일기 쓰러 가기
        {/if}
      </Button>
    </form>

    <div class="border-border border-t pt-5">
      <Button href="/teacher/login" variant="link" class="px-0 text-muted-foreground">
        교사 대시보드 로그인
      </Button>
    </div>
  </section>
</div>
