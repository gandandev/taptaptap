<script lang="ts">
  import { Alert, AlertDescription } from '$lib/components/ui/alert'
  import { Button } from '$lib/components/ui/button'
  import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
  } from '$lib/components/ui/card'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'

  import type { PageProps } from './$types'

  let { data, form }: PageProps = $props()

  let errorMessage = $derived(form?.message ?? data.errorMessage)
  let codeValue = $derived(form?.code ?? '')
</script>

<svelte:head>
  <title>감정일기 | 학생 코드 입력</title>
</svelte:head>

<div class="mx-auto flex min-h-screen max-w-xl items-center px-6 py-10">
  <Card class="w-full py-0">
    <CardHeader class="pb-0">
      <p class="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">TapTapTap</p>
      <CardTitle class="mt-2 text-3xl">감정일기 시작하기</CardTitle>
      <CardDescription>선생님이 알려준 6자리 학생 코드를 입력해 주세요.</CardDescription>
    </CardHeader>

    <CardContent class="pt-6">
      <form method="POST" class="space-y-4">
        <div class="space-y-2">
          <Label for="student-code">학생 코드</Label>
          <Input
            id="student-code"
            name="code"
            type="text"
            inputmode="numeric"
            pattern="[0-9]{6}"
            maxlength={6}
            value={codeValue}
            placeholder="예: 012345"
            class="h-11 text-lg tracking-[0.2em] placeholder:tracking-normal"
            required
          />
        </div>

        {#if errorMessage}
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        {/if}

        <Button type="submit" class="h-11 w-full">감정일기 쓰러 가기</Button>
      </form>
    </CardContent>

    <CardFooter class="border-t pt-4">
      <Button href="/teacher/login" variant="link" class="px-0 text-muted-foreground">
        교사 대시보드 로그인
      </Button>
    </CardFooter>
  </Card>
</div>
