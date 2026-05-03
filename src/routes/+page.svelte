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
  const initialSetupNameText = untrack(() =>
    form && 'setupName' in form && typeof form.setupName === 'string' ? form.setupName : ''
  )
  const initialBirthDateText = untrack(() =>
    form && 'birthDate' in form && typeof form.birthDate === 'string' ? form.birthDate : ''
  )

  let studentName = $state(initialNameText)
  let setupName = $state(initialSetupNameText)
  let pin = $state('')
  let birthDate = $state(initialBirthDateText)
  let newPin = $state('')
  let loggingIn = $state(false)
  let settingPin = $state(false)
  let loginMessage = $derived(form?.message ?? data.errorMessage)
  let setupMessage = $derived(form && 'setupMessage' in form ? form.setupMessage : null)
  let isLoginReady = $derived(studentName.trim().length > 0 && pin.replace(/\D/g, '').length === 4)
  let isSetupReady = $derived(
    setupName.trim().length > 0 &&
      birthDate.replace(/\D/g, '').length === 4 &&
      newPin.replace(/\D/g, '').length === 4
  )

  function fourDigits(rawValue: string) {
    return rawValue.replace(/\D/g, '').slice(0, 4)
  }

  function formatBirthDateInput(rawValue: string) {
    const digits = fourDigits(rawValue)

    if (digits.length <= 2) return digits
    return `${digits.slice(0, 2)}-${digits.slice(2, 4)}`
  }
</script>

<svelte:head>
  <title>감정일기 | 학생 확인</title>
</svelte:head>

<div class="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-12">
  <section class="w-full space-y-10">
    <div class="max-w-2xl space-y-3">
      <p class="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">TapTapTap</p>
      <h1 class="text-4xl font-semibold tracking-tight sm:text-5xl">감정일기 시작하기</h1>
      <p class="text-lg text-muted-foreground">이름과 4자리 PIN으로 오늘의 감정일기를 써요.</p>
    </div>

    <div class="grid gap-5 lg:grid-cols-2">
      <form
        method="POST"
        action="?/login"
        class="space-y-5 rounded-lg border p-5"
        onsubmit={() => (loggingIn = true)}
      >
        <div class="space-y-1">
          <h2 class="text-xl font-semibold tracking-tight">PIN으로 들어가기</h2>
          <p class="text-sm text-muted-foreground">이미 PIN을 만든 학생은 여기에서 시작해요.</p>
        </div>

        <div class="space-y-3">
          <Label for="student-name" class="text-base">이름</Label>
          <Input
            id="student-name"
            name="name"
            type="text"
            bind:value={studentName}
            class="h-12 rounded-xl"
            maxlength={40}
            autocomplete="name"
            placeholder="이름을 입력해 주세요"
            readonly={loggingIn}
            aria-disabled={loggingIn}
            required
            oninput={() => (loggingIn = false)}
          />
        </div>

        <div class="space-y-3">
          <Label for="student-pin" class="text-base">PIN</Label>
          <Input
            id="student-pin"
            name="pin"
            type="password"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength={4}
            bind:value={pin}
            class="h-12 rounded-xl text-lg font-semibold tracking-[0.5em]"
            placeholder="0000"
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
          <Alert variant="destructive">
            <AlertDescription>{loginMessage}</AlertDescription>
          </Alert>
        {/if}

        <Button
          type="submit"
          class="h-12 w-full rounded-xl text-base"
          disabled={loggingIn || !isLoginReady}
        >
          {#if loggingIn}
            <LoaderCircle class="size-4 animate-spin" />
            확인 중...
          {:else}
            감정일기 쓰러 가기
          {/if}
        </Button>
      </form>

      <form
        method="POST"
        action="?/setup"
        class="space-y-5 rounded-lg border p-5"
        onsubmit={() => (settingPin = true)}
      >
        <div class="space-y-1">
          <h2 class="text-xl font-semibold tracking-tight">처음이거나 재설정한 경우</h2>
          <p class="text-sm text-muted-foreground">이름과 생일을 확인한 뒤 새 PIN을 만들어요.</p>
        </div>

        <div class="space-y-3">
          <Label for="setup-student-name" class="text-base">이름</Label>
          <Input
            id="setup-student-name"
            name="setupName"
            type="text"
            bind:value={setupName}
            class="h-12 rounded-xl"
            maxlength={40}
            autocomplete="name"
            placeholder="이름을 입력해 주세요"
            readonly={settingPin}
            aria-disabled={settingPin}
            required
            oninput={() => (settingPin = false)}
          />
        </div>

        <div class="space-y-3">
          <Label for="student-birth-date" class="text-base">생일</Label>
          <Input
            id="student-birth-date"
            name="birthDate"
            type="text"
            inputmode="numeric"
            pattern="[0-9-]*"
            maxlength={5}
            bind:value={birthDate}
            class="h-12 rounded-xl text-lg font-semibold"
            placeholder="예: 05-03"
            autocomplete="bday"
            readonly={settingPin}
            aria-disabled={settingPin}
            required
            oninput={(event) => {
              birthDate = formatBirthDateInput((event.currentTarget as HTMLInputElement).value)
              settingPin = false
            }}
          />
        </div>

        <div class="space-y-3">
          <Label for="new-student-pin" class="text-base">새 PIN</Label>
          <Input
            id="new-student-pin"
            name="newPin"
            type="password"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength={4}
            bind:value={newPin}
            class="h-12 rounded-xl text-lg font-semibold tracking-[0.5em]"
            placeholder="0000"
            autocomplete="new-password"
            readonly={settingPin}
            aria-disabled={settingPin}
            required
            oninput={(event) => {
              newPin = fourDigits((event.currentTarget as HTMLInputElement).value)
              settingPin = false
            }}
          />
          <p class="text-xs text-muted-foreground">PIN은 숫자 4자리로만 만들 수 있어요.</p>
        </div>

        {#if setupMessage}
          <Alert variant="destructive">
            <AlertDescription>{setupMessage}</AlertDescription>
          </Alert>
        {/if}

        <Button
          type="submit"
          variant="secondary"
          class="h-12 w-full rounded-xl text-base"
          disabled={settingPin || !isSetupReady}
        >
          {#if settingPin}
            <LoaderCircle class="size-4 animate-spin" />
            설정 중...
          {:else}
            PIN 만들고 시작하기
          {/if}
        </Button>
      </form>
    </div>

    <div class="border-t border-border pt-5">
      <Button href="/teacher/login" variant="link" class="px-0 text-muted-foreground">
        교사 대시보드 로그인
      </Button>
    </div>
  </section>
</div>
