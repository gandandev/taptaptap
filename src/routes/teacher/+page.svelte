<script lang="ts">
  import LoaderCircle from '@lucide/svelte/icons/loader-circle'
  import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert'
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
  import type {
    EmotionTrend,
    RiskAlert,
    SelTrend,
    StudentDashboardSummary
  } from '$lib/shared/emotion-analysis'

  import type { PageProps } from './$types'

  type TeacherDashboardData = PageProps['data'] & {
    students: StudentDashboardSummary[]
    riskAlerts: RiskAlert[]
    emotionTrends: EmotionTrend[]
    selTrends: SelTrend[]
  }

  let { data, form }: PageProps = $props()
  const dashboardData = $derived(data as TeacherDashboardData)
  let creatingStudent = $state(false)

  function moodBadgeVariant(mood: string): BadgeVariant {
    if (['화남', '억울함', '불안함', '짜증남', '슬픔', '외로움', '무기력', '우울'].includes(mood)) {
      return 'destructive'
    }
    if (['기쁨', '설렘', '뿌듯함', '편안함'].includes(mood)) return 'secondary'
    return 'outline'
  }

  function moodBadgeClass(mood: string) {
    if (['기쁨', '설렘'].includes(mood)) {
      return 'bg-sky-100 text-sky-700 hover:bg-sky-100 dark:bg-sky-950/50 dark:text-sky-200'
    }
    if (['뿌듯함', '편안함'].includes(mood)) {
      return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-200'
    }
    return ''
  }

  function trendPercent(count: number, total: number) {
    if (total === 0) return 0

    return Math.max(8, Math.round((count / total) * 100))
  }

  function formatBirthDate(birthDate: string | null) {
    if (!birthDate) return '-'

    const [month, day] = birthDate.split('-')
    if (!month || !day) return birthDate

    return `${Number(month)}월 ${Number(day)}일`
  }
</script>

<svelte:head>
  <title>교사 대시보드 | 감정일기</title>
</svelte:head>

<div class="grid gap-6 xl:grid-cols-[340px_1fr]">
  <section class="space-y-6">
    <div class="space-y-1 border-b pb-4">
      <h2 class="text-xl font-semibold tracking-tight">학생 등록</h2>
      <p class="text-sm text-muted-foreground">
        이름과 생일을 입력하면 학생 접근 정보가 만들어집니다.
      </p>
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
          required
        />
      </div>

      <div class="space-y-2">
        <Label for="student-birth-date">생일</Label>
        <Input
          id="student-birth-date"
          type="text"
          inputmode="numeric"
          pattern="[0-9-]*"
          maxlength={5}
          name="birthDate"
          placeholder="예: 05-03"
          class="h-11"
          required
        />
        <p class="text-xs text-muted-foreground">월/일 4자리로 입력해 주세요. 예: 0503</p>
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

    <div class="space-y-3 rounded-lg border p-4">
      <div>
        <h3 class="font-semibold tracking-tight">학급 정서 트렌드</h3>
        <p class="text-sm text-muted-foreground">최근 30일 기준</p>
      </div>
      {#if dashboardData.emotionTrends.length === 0}
        <p class="text-sm text-muted-foreground">아직 집계할 기록이 없어요.</p>
      {:else}
        <div class="space-y-3">
          {#each dashboardData.emotionTrends as trend}
            <div class="space-y-1">
              <div class="flex items-center justify-between gap-3 text-sm">
                <span>{trend.label}</span>
                <span class="text-muted-foreground">{trend.count}건</span>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  class="h-full rounded-full bg-primary"
                  style={`width: ${trendPercent(trend.count, dashboardData.emotionTrends[0]?.count ?? 0)}%`}
                ></div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </section>

  <section class="space-y-6">
    {#if dashboardData.riskAlerts.length > 0}
      <div class="space-y-2">
        {#each dashboardData.riskAlerts as alert}
          <Alert variant="destructive">
            <AlertTitle>위기 학생 알림</AlertTitle>
            <AlertDescription>{alert.message}</AlertDescription>
          </Alert>
        {/each}
      </div>
    {/if}

    <div class="grid gap-3 md:grid-cols-4">
      {#each dashboardData.selTrends as trend}
        <div class="rounded-lg border p-4">
          <p class="text-sm font-semibold">{trend.competency.label}</p>
          <p class="mt-1 text-2xl font-semibold tracking-tight">{trend.count}</p>
          <p class="mt-1 text-xs leading-relaxed text-muted-foreground">
            {trend.competency.description}
          </p>
        </div>
      {/each}
    </div>

    <div class="flex flex-wrap items-center justify-between gap-2 border-b pb-4">
      <div>
        <h2 class="text-xl font-semibold tracking-tight">오늘 제출 현황</h2>
        <p class="text-sm text-muted-foreground">기준 날짜 (KST): {data.todayDate}</p>
      </div>
      <Badge variant="outline">총 {dashboardData.students.length}명</Badge>
    </div>

    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>학생</TableHead>
          <TableHead>생일</TableHead>
          <TableHead>PIN</TableHead>
          <TableHead>제출</TableHead>
          <TableHead>감정</TableHead>
          <TableHead>강도</TableHead>
          <TableHead>SEL</TableHead>
          <TableHead>사건</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#if dashboardData.students.length === 0}
          <TableRow>
            <TableCell colspan={8} class="py-8 text-center text-muted-foreground">
              등록된 학생이 없어요.
            </TableCell>
          </TableRow>
        {:else}
          {#each dashboardData.students as student}
            <TableRow class="align-top">
              <TableCell class="font-medium">
                <Button
                  href={`/teacher/students/${student.studentId}`}
                  variant="link"
                  class="h-auto px-0 py-0"
                >
                  {student.name}
                </Button>
              </TableCell>
              <TableCell class="text-sm">{formatBirthDate(student.birthDate)}</TableCell>
              <TableCell>
                {#if student.pinResetRequired || !student.hasPin}
                  <Badge variant="outline">설정 필요</Badge>
                {:else}
                  <Badge variant="secondary">사용 중</Badge>
                {/if}
              </TableCell>
              <TableCell>
                {#if student.hasSubmittedToday}
                  <Badge
                    class="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-200"
                  >
                    제출함
                  </Badge>
                {:else}
                  <Badge variant="outline">미제출</Badge>
                {/if}
              </TableCell>
              <TableCell>
                {#if student.moodPrimary}
                  <Badge
                    variant={moodBadgeVariant(student.moodPrimary)}
                    class={moodBadgeClass(student.moodPrimary)}
                  >
                    {student.moodPrimary}
                  </Badge>
                {:else}
                  <span class="text-muted-foreground">-</span>
                {/if}
              </TableCell>
              <TableCell>
                {#if student.intensityScore}
                  <Badge variant={student.isHighRiskToday ? 'destructive' : 'outline'}
                    >{student.intensityScore}점</Badge
                  >
                {:else}
                  <span class="text-muted-foreground/60">-</span>
                {/if}
              </TableCell>
              <TableCell>
                {#if student.selCompetency}
                  <Badge variant="outline">{student.selCompetency.label}</Badge>
                {:else}
                  <span class="text-muted-foreground/60">-</span>
                {/if}
              </TableCell>
              <TableCell class="text-sm whitespace-normal">
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
