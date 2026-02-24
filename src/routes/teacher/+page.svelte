<script lang="ts">
  import LoaderCircle from '@lucide/svelte/icons/loader-circle'
  import { Alert, AlertDescription } from '$lib/components/ui/alert'
  import { Badge, type BadgeVariant } from '$lib/components/ui/badge'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
  } from '$lib/components/ui/table'

  import type { PageProps } from './$types'

  let { data, form }: PageProps = $props()
  let creatingStudent = $state(false)

  function moodBadgeVariant(mood: string): BadgeVariant {
    if (mood === '안 좋아...') return 'destructive'
    if (mood === '좋아!') return 'secondary'
    return 'outline'
  }

  function moodBadgeClass(mood: string) {
    if (mood === '좋아!') return 'bg-sky-100 text-sky-700 hover:bg-sky-100 dark:bg-sky-950/50 dark:text-sky-200'
    if (mood === '그냥 그래') return 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-200'
    return ''
  }
</script>

<svelte:head>
  <title>교사 대시보드 | 감정일기</title>
</svelte:head>

<div class="grid gap-6 lg:grid-cols-[360px_1fr]">
  <section class="space-y-6">
    <div class="space-y-1 border-b pb-4">
      <h2 class="text-xl font-semibold tracking-tight">학생 등록</h2>
      <p class="text-muted-foreground text-sm">이름을 입력하면 6자리 학생 코드가 자동 생성됩니다.</p>
    </div>

    <form method="POST" class="space-y-4" onsubmit={() => (creatingStudent = true)}>
      <div class="space-y-2">
        <Label for="student-name">학생 이름</Label>
        <Input
          id="student-name"
          type="text"
          name="name"
          placeholder="예: 김민지"
          class="h-11"
          disabled={creatingStudent}
          required
        />
      </div>

      {#if form?.message}
        <Alert variant={form.createdStudent ? 'default' : 'destructive'}>
          <AlertDescription>{form.message}</AlertDescription>
        </Alert>
      {/if}

      <Button type="submit" class="h-11 w-full" disabled={creatingStudent}>
        {#if creatingStudent}
          <LoaderCircle class="size-4 animate-spin" />
          추가 중...
        {:else}
          학생 추가
        {/if}
      </Button>
    </form>
  </section>

  <section class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b pb-4">
      <div>
        <h2 class="text-xl font-semibold tracking-tight">오늘 제출 현황</h2>
        <p class="text-muted-foreground text-sm">기준 날짜 (KST): {data.todayDate}</p>
      </div>
      <Badge variant="outline">총 {data.students.length}명</Badge>
    </div>

    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>학생</TableHead>
          <TableHead>코드</TableHead>
          <TableHead>제출</TableHead>
          <TableHead>감정</TableHead>
          <TableHead>이유/메모</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#if data.students.length === 0}
          <TableRow>
            <TableCell colspan={5} class="text-muted-foreground py-8 text-center">
              등록된 학생이 없어요.
            </TableCell>
          </TableRow>
        {:else}
          {#each data.students as student}
            <TableRow class="align-top">
              <TableCell class="font-medium">
                <Button href={`/teacher/students/${student.studentId}`} variant="link" class="h-auto px-0 py-0">
                  {student.name}
                </Button>
              </TableCell>
              <TableCell class="font-mono text-xs sm:text-sm">{student.code}</TableCell>
              <TableCell>
                {#if student.hasSubmittedToday}
                  <Badge class="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-200">
                    제출함
                  </Badge>
                {:else}
                  <Badge variant="outline">미제출</Badge>
                {/if}
              </TableCell>
              <TableCell>
                {#if student.moodPrimary}
                  <Badge variant={moodBadgeVariant(student.moodPrimary)} class={moodBadgeClass(student.moodPrimary)}>
                    {student.moodPrimary}
                  </Badge>
                {:else}
                  <span class="text-muted-foreground">-</span>
                {/if}
              </TableCell>
              <TableCell class="whitespace-normal text-sm">
                {#if student.badReasonSummary}
                  {student.badReasonSummary}
                {:else if student.hasSubmittedToday}
                  <span class="text-muted-foreground">(없음)</span>
                {:else}
                  <span class="text-muted-foreground/60">-</span>
                {/if}
              </TableCell>
            </TableRow>
          {/each}
        {/if}
      </TableBody>
    </Table>
  </section>
</div>
