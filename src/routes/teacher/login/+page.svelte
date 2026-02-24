<script lang="ts">
  import { Alert, AlertDescription } from '$lib/components/ui/alert'
  import { Button } from '$lib/components/ui/button'
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
  } from '$lib/components/ui/card'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'

  import type { PageProps } from './$types'

  let { form }: PageProps = $props()
</script>

<svelte:head>
  <title>교사 로그인 | 감정일기</title>
</svelte:head>

<div class="mx-auto flex min-h-screen max-w-xl items-center px-6 py-10">
  <Card class="w-full py-0">
    <CardHeader class="pb-0">
      <p class="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">Teacher</p>
      <CardTitle class="mt-2 text-2xl">교사 대시보드 로그인</CardTitle>
      <CardDescription>환경변수에 설정된 비밀번호로 로그인합니다.</CardDescription>
    </CardHeader>

    <CardContent class="pt-6">
      <form method="POST" class="space-y-4">
        <div class="space-y-2">
          <Label for="teacher-password">비밀번호</Label>
          <Input id="teacher-password" type="password" name="password" class="h-11" required />
        </div>

        {#if form?.message}
          <Alert variant="destructive">
            <AlertDescription>{form.message}</AlertDescription>
          </Alert>
        {/if}

        <Button type="submit" class="h-11 w-full">로그인</Button>
      </form>
    </CardContent>
  </Card>
</div>
