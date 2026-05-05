<script lang="ts">
  import { enhance } from '$app/forms'
  import ChevronLeft from '@lucide/svelte/icons/chevron-left'
  import ChevronRight from '@lucide/svelte/icons/chevron-right'
  import RefreshCw from '@lucide/svelte/icons/refresh-cw'
  import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert'
  import { Badge } from '$lib/components/ui/badge'
  import { Button } from '$lib/components/ui/button'
  import { DatePicker } from '$lib/components/ui/date-picker'
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
  } from '$lib/components/ui/table'
  import { buildLocalEmotionReflection } from '$lib/shared/emotion-reflection'
  import type { SelTrend, StudentDashboardSummary } from '$lib/shared/emotion-analysis'

  import type { PageProps } from './$types'

  type TeacherDashboardData = PageProps['data'] & {
    selectedDate: string
    todayDate: string
    recentStartDate: string
    students: StudentDashboardSummary[]
    selTrends: SelTrend[]
    submittedTodayCount: number
    aiSummary: {
      bullets: string[]
      neededCompetency: {
        id: string
        label: string
        description: string
      }
      source: 'ai' | 'local'
      generatedAt: Date
    } | null
    dashboardError: string | null
  }
  type TeacherDashboardForm = {
    action?: string
    message?: string
  } | null

  let { data, form }: PageProps = $props()
  const dashboardData = $derived(data as TeacherDashboardData)
  const actionResult = $derived((form as TeacherDashboardForm) ?? null)
  const isSelectedDateToday = $derived(dashboardData.selectedDate === dashboardData.todayDate)
  const selectedDateLabel = $derived(formatDateLabel(dashboardData.selectedDate))
  const trendDateRangeLabel = $derived(
    `${formatShortDate(dashboardData.recentStartDate)}-${formatShortDate(dashboardData.selectedDate)}`
  )
  const selTrendTotal = $derived(
    dashboardData.selTrends.reduce((total, trend) => total + trend.count, 0)
  )
  const canPlaceSelLabelsUnderSegments = $derived(
    selTrendTotal > 0 &&
      dashboardData.selTrends.every((trend) => trend.count === 0 || selPercent(trend.count) >= 18)
  )
  const selSegmentColors = {
    care: 'oklch(0.64 0.16 26)',
    communication: 'oklch(0.6 0.14 221)',
    self: 'oklch(0.57 0.15 145)',
    responsibility: 'oklch(0.62 0.14 82)'
  } as const
  let addingStudents = $state(false)
  let regeneratingSummary = $state(false)
  let showAddStudents = $state(false)
  const addStudentsPlaceholder = `줄바꿈을 기준으로 여러 학생을 추가하세요.  예시:

김민지
박서준
이하율`

  function selPercent(count: number) {
    if (selTrendTotal === 0) return 0

    return Math.round((count / selTrendTotal) * 1000) / 10
  }

  function selSegmentColor(trend: SelTrend) {
    return (
      selSegmentColors[trend.competency.id as keyof typeof selSegmentColors] ?? 'oklch(0.48 0 0)'
    )
  }

  function getStudentReflectionSummary(student: StudentDashboardSummary) {
    if (!student.hasSubmittedToday) return '-'
    if (student.reflectionSummary) return student.reflectionSummary

    return student.answers ? buildLocalEmotionReflection(student.answers).summary : '-'
  }

  function parseDate(date: string) {
    const [year, month, day] = date.split('-').map(Number)

    return new Date(Date.UTC(year, month - 1, day))
  }

  function addDays(date: string, days: number) {
    const [year, month, day] = date.split('-').map(Number)
    const parsedDate = new Date(Date.UTC(year, month - 1, day + days))

    return parsedDate.toISOString().slice(0, 10)
  }

  function formatDateLabel(date: string) {
    const parsedDate = parseDate(date)

    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
      timeZone: 'UTC'
    }).format(parsedDate)
  }

  function formatShortDate(date: string) {
    const [, month, day] = date.split('-')

    return `${Number(month)}.${Number(day)}`
  }

  function navigateToDashboardDate(date: string) {
    window.location.href = date === dashboardData.todayDate ? '/teacher' : `/teacher?date=${date}`
  }
</script>

<svelte:head>
  <title>교사 대시보드 | 감정일기</title>
</svelte:head>

<div class="mx-auto max-w-5xl">
  <section class="space-y-8">
    {#if dashboardData.dashboardError}
      <Alert class="border-yellow-200 bg-yellow-50 text-yellow-950">
        <AlertTitle>대시보드 데이터를 불러오지 못했어요</AlertTitle>
        <AlertDescription class="text-yellow-900">{dashboardData.dashboardError}</AlertDescription>
      </Alert>
    {/if}

    {#if actionResult?.message}
      <Alert class="border-yellow-200 bg-yellow-50 text-yellow-950">
        <AlertDescription class="text-yellow-900">{actionResult.message}</AlertDescription>
      </Alert>
    {/if}

    <section class="flex flex-col gap-4 border-b pb-6">
      <div class="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div class="flex flex-col gap-1">
          <h1 class="text-2xl font-semibold tracking-tight">감정일기 교사 대시보드</h1>
          <p class="text-sm text-muted-foreground">
            {selectedDateLabel} 기준 제출 현황과 최근 30일 흐름
          </p>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <div class="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2 sm:flex">
            <Button
              type="button"
              variant="outline"
              size="icon"
              class="size-10 rounded-xl bg-transparent"
              aria-label="이전 날짜"
              onclick={() => navigateToDashboardDate(addDays(dashboardData.selectedDate, -1))}
            >
              <ChevronLeft class="size-4" />
            </Button>
            <DatePicker
              value={dashboardData.selectedDate}
              max={dashboardData.todayDate}
              class="min-w-0"
              onSelect={navigateToDashboardDate}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              class="size-10 rounded-xl bg-transparent"
              disabled={isSelectedDateToday}
              aria-label="다음 날짜"
              onclick={() => navigateToDashboardDate(addDays(dashboardData.selectedDate, 1))}
            >
              <ChevronRight class="size-4" />
            </Button>
          </div>
          <Button
            type="button"
            variant="secondary"
            class="h-10 rounded-xl"
            disabled={isSelectedDateToday}
            onclick={() => navigateToDashboardDate(dashboardData.todayDate)}
          >
            오늘
          </Button>
        </div>
      </div>
    </section>

    <section class="space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-primary">AI 학급 요약</p>
        </div>
        <div class="flex items-center gap-2">
          {#if dashboardData.aiSummary}
            <Badge variant="secondary" class="bg-transparent px-0">
              {regeneratingSummary
                ? 'AI 분석 중'
                : dashboardData.aiSummary.source === 'ai'
                  ? 'AI 분석'
                  : '로컬 분석'}
            </Badge>
          {/if}
          <form
            method="POST"
            action="?/regenerateSummary"
            use:enhance={() => {
              regeneratingSummary = true

              return async ({ update }) => {
                try {
                  await update()
                } finally {
                  regeneratingSummary = false
                }
              }
            }}
          >
            <input type="hidden" name="date" value={dashboardData.selectedDate} />
            <Button
              type="submit"
              variant="outline"
              size="icon"
              class="size-8 rounded-xl bg-transparent"
              disabled={dashboardData.submittedTodayCount === 0 || regeneratingSummary}
              aria-label="AI 학급 요약 재생성"
              title="AI 학급 요약 재생성"
            >
              <RefreshCw class={`size-4 ${regeneratingSummary ? 'animate-spin' : ''}`} />
            </Button>
          </form>
        </div>
      </div>

      {#if regeneratingSummary}
        <div class="space-y-2.5" aria-label="AI 학급 요약 분석 중">
          <div class="skeleton-shimmer h-4 w-full rounded-full"></div>
          <div class="skeleton-shimmer h-4 w-11/12 rounded-full"></div>
          <div class="skeleton-shimmer h-4 w-8/12 rounded-full"></div>
        </div>
      {:else if dashboardData.aiSummary}
        <ul class="list-disc space-y-1.5 pl-5">
          {#each dashboardData.aiSummary.bullets as bullet (bullet)}
            <li class="text-sm leading-snug">{bullet}</li>
          {/each}
        </ul>
      {:else if dashboardData.submittedTodayCount === 0}
        <div class="text-sm leading-relaxed text-muted-foreground">
          선택한 날짜에 제출한 학생이 없어 AI 요약을 생성하지 않았어요.
        </div>
      {:else}
        <p class="text-sm text-muted-foreground">요약을 불러올 수 없어요.</p>
      {/if}
    </section>

    <section class="space-y-3">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="space-y-1">
          <p class="text-sm font-semibold text-primary">사회정서역량</p>
          {#if dashboardData.aiSummary}
            <p class="text-xl font-semibold tracking-tight">
              {dashboardData.aiSummary.neededCompetency.label}
            </p>
          {:else}
            <p class="text-xl font-semibold tracking-tight">최근 기록</p>
          {/if}
        </div>
        <p class="text-sm font-medium text-muted-foreground">
          최근 30일 선택 집계 · {trendDateRangeLabel}
        </p>
      </div>

      <div class="h-3 w-full overflow-hidden rounded-full bg-muted">
        {#if selTrendTotal > 0}
          <div class="flex h-full w-full">
            {#each dashboardData.selTrends as trend (trend.competency.id)}
              {#if trend.count > 0}
                <div
                  class="h-full"
                  style={`width: ${selPercent(trend.count)}%; background: ${selSegmentColor(trend)};`}
                ></div>
              {/if}
            {/each}
          </div>
        {/if}
      </div>

      {#if canPlaceSelLabelsUnderSegments}
        <div class="hidden w-full md:flex">
          {#each dashboardData.selTrends as trend (trend.competency.id)}
            {#if trend.count > 0}
              <div class="min-w-0 pt-1 text-xs" style={`width: ${selPercent(trend.count)}%;`}>
                <div class="flex min-w-0 items-center gap-1.5">
                  <span
                    class="size-2 shrink-0 rounded-full"
                    style={`background: ${selSegmentColor(trend)};`}
                  ></span>
                  <span class="truncate font-semibold text-primary">{trend.competency.label}</span>
                </div>
                <div class="text-muted-foreground">{trend.count}</div>
              </div>
            {/if}
          {/each}
        </div>
      {/if}

      <div
        class="grid grid-cols-1 gap-y-2 md:grid-cols-4 md:gap-x-5"
        class:md:hidden={canPlaceSelLabelsUnderSegments}
      >
        {#each dashboardData.selTrends as trend (trend.competency.id)}
          <div class="flex items-center justify-between gap-3 text-sm">
            <span class="flex min-w-0 items-center gap-2 font-medium text-foreground">
              <span
                class="size-2.5 shrink-0 rounded-full"
                style={`background: ${selSegmentColor(trend)};`}
              ></span>
              <span class="truncate">{trend.competency.label}</span>
            </span>
            <span class="text-muted-foreground/80">{trend.count}</span>
          </div>
        {/each}
      </div>
    </section>

    <section class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-xl font-semibold tracking-tight">학생</h2>
        </div>
        <div class="flex items-center gap-3">
          <Badge variant="secondary" class="bg-transparent px-0"
            >총 {dashboardData.students.length}명</Badge
          >
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="rounded-xl bg-transparent"
            onclick={() => (showAddStudents = !showAddStudents)}
          >
            학생 추가
          </Button>
        </div>
      </div>

      {#if showAddStudents}
        <form
          method="POST"
          action="?/createStudents"
          class="space-y-3"
          onsubmit={() => {
            addingStudents = true
          }}
        >
          <textarea
            name="names"
            rows="5"
            class="min-h-28 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder={addStudentsPlaceholder}
            required
          ></textarea>
          <div class="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class="rounded-xl"
              onclick={() => (showAddStudents = false)}
            >
              취소
            </Button>
            <Button type="submit" size="sm" class="rounded-xl" disabled={addingStudents}>
              추가
            </Button>
          </div>
        </form>
      {/if}

      {#if form?.action === 'createStudents' && form?.message}
        <Alert
          class={form.createdStudents ? 'border-green-200 bg-green-50 text-green-950' : undefined}
          variant={form.createdStudents ? 'default' : 'destructive'}
        >
          <AlertDescription class={form.createdStudents ? 'text-green-900' : undefined}>
            {form.message}
          </AlertDescription>
        </Alert>
      {/if}

      {#if dashboardData.students.length === 0}
        <p class="py-8 text-center text-sm text-muted-foreground">등록된 학생이 없어요.</p>
      {:else}
        <div class="overflow-hidden rounded-lg border bg-background">
          <Table class="table-fixed">
            <TableHeader>
              <TableRow class="bg-muted/40 hover:[&,&>svelte-css-wrapper]:[&>th,td]:bg-muted/40">
                <TableHead class="w-[24%] px-4">학생</TableHead>
                <TableHead class="w-[7rem] px-4">제출</TableHead>
                <TableHead class="px-4">일기 요약</TableHead>
                <TableHead class="w-[10rem] px-4 text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {#each dashboardData.students as student (student.studentId)}
                <TableRow>
                  <TableCell class="px-4 py-3 font-medium">
                    <Button
                      href={`/teacher/students/${student.studentId}`}
                      variant="link"
                      class="h-auto px-0 py-0 text-primary"
                    >
                      {student.name}
                    </Button>
                  </TableCell>
                  <TableCell class="px-4 py-3">
                    <Badge
                      variant={student.hasSubmittedToday ? 'default' : 'secondary'}
                      class={student.hasSubmittedToday
                        ? undefined
                        : 'bg-muted text-muted-foreground'}
                    >
                      {student.hasSubmittedToday ? '제출함' : '미제출'}
                    </Badge>
                  </TableCell>
                  <TableCell class="min-w-0 px-4 py-3 whitespace-normal text-muted-foreground">
                    <p class="line-clamp-2 min-w-0 overflow-hidden leading-relaxed break-words">
                      {getStudentReflectionSummary(student)}
                    </p>
                  </TableCell>
                  <TableCell class="px-4 py-3">
                    <form
                      method="POST"
                      action="?/resetPin"
                      class="flex justify-end"
                      onsubmit={(event) => {
                        if (!confirm(`${student.name} 학생의 비밀번호를 재설정할까요?`)) {
                          event.preventDefault()
                        }
                      }}
                    >
                      <input type="hidden" name="studentId" value={student.studentId} />
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        class="rounded-lg bg-transparent"
                      >
                        비밀번호 재설정
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              {/each}
            </TableBody>
          </Table>
        </div>
      {/if}
    </section>
  </section>
</div>
