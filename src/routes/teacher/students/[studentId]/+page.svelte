<script lang="ts">
  import LoaderCircle from '@lucide/svelte/icons/loader-circle'
  import { Alert, AlertDescription } from '$lib/components/ui/alert'
  import { Badge, type BadgeVariant } from '$lib/components/ui/badge'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import {
    getEmotionAnswerDisplayPairs,
    getEntryIntensityScore,
    getSelCompetencyForAnswers
  } from '$lib/shared/emotion-analysis'

  import type { PageProps } from './$types'

  type StudentWithBirthDate = PageProps['data']['student'] & {
    birthDate: string | null
    hasPin: boolean
    pinResetRequired: boolean
  }

  let { data, form }: PageProps = $props()
  const studentData = $derived(data.student as StudentWithBirthDate)
  let deletingStudent = $state(false)
  let savingBirthDate = $state(false)
  let resettingPin = $state(false)

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

  function formatBirthDate(birthDate: string | null) {
    if (!birthDate) return '미등록'

    const [month, day] = birthDate.split('-')
    if (!month || !day) return birthDate

    return `${Number(month)}월 ${Number(day)}일`
  }

  function birthDateInputValue(birthDate: string | null) {
    return birthDate?.replace('-', '') ?? ''
  }
</script>

<svelte:head>
  <title>{studentData.name} | 학생 감정일기 이력</title>
</svelte:head>

<div class="space-y-4">
  <section class="space-y-3 border-b pb-5">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="space-y-2">
        <Button href="/teacher" variant="outline" size="sm">오늘 목록으로</Button>
        <h2 class="text-2xl font-semibold tracking-tight">{studentData.name}</h2>
        <div class="flex flex-wrap items-center gap-2">
          <p class="text-sm text-muted-foreground">생일 {formatBirthDate(studentData.birthDate)}</p>
          {#if studentData.pinResetRequired || !studentData.hasPin}
            <Badge variant="outline">PIN 설정 필요</Badge>
          {:else}
            <Badge variant="secondary">PIN 사용 중</Badge>
          {/if}
        </div>
      </div>
      <div class="flex flex-wrap items-center justify-end gap-2">
        <Badge variant="outline">기록 {data.entries.length}건</Badge>
        <form
          method="POST"
          action="?/delete"
          onsubmit={(event) => {
            if (!confirm(`${studentData.name} 학생을 삭제할까요? 제출 기록도 함께 삭제됩니다.`)) {
              event.preventDefault()
              return
            }

            deletingStudent = true
          }}
        >
          <Button type="submit" variant="destructive" size="sm" disabled={deletingStudent}>
            {#if deletingStudent}
              <LoaderCircle class="size-4 animate-spin" />
              삭제 중...
            {:else}
              학생 삭제
            {/if}
          </Button>
        </form>
      </div>
    </div>
    {#if form?.message}
      <Alert variant={form.message.includes('저장') ? 'default' : 'destructive'}>
        <AlertDescription>{form.message}</AlertDescription>
      </Alert>
    {/if}

    <form
      method="POST"
      action="?/updateBirthDate"
      class="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-end"
      onsubmit={() => (savingBirthDate = true)}
    >
      <div class="flex-1 space-y-2">
        <Label for="student-birth-date">생일</Label>
        <Input
          id="student-birth-date"
          type="text"
          inputmode="numeric"
          pattern="[0-9-]*"
          maxlength={5}
          name="birthDate"
          value={birthDateInputValue(studentData.birthDate)}
          placeholder="예: 05-03"
          class="h-10"
          required
        />
      </div>
      <Button type="submit" variant="outline" disabled={savingBirthDate}>
        {#if savingBirthDate}
          <LoaderCircle class="size-4 animate-spin" />
          저장 중...
        {:else}
          생일 저장
        {/if}
      </Button>
    </form>

    <form
      method="POST"
      action="?/resetPin"
      class="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
      onsubmit={(event) => {
        if (!confirm(`${studentData.name} 학생의 PIN을 재설정할까요?`)) {
          event.preventDefault()
          return
        }

        resettingPin = true
      }}
    >
      <div>
        <p class="text-sm font-medium">PIN 재설정</p>
        <p class="text-xs text-muted-foreground">
          기존 PIN은 볼 수 없고, 학생이 새 PIN을 다시 만듭니다.
        </p>
      </div>
      <Button type="submit" variant="outline" disabled={resettingPin}>
        {#if resettingPin}
          <LoaderCircle class="size-4 animate-spin" />
          재설정 중...
        {:else}
          PIN 재설정
        {/if}
      </Button>
    </form>

    <p class="text-xs text-muted-foreground">
      삭제하면 학생 정보와 제출된 감정일기 기록이 함께 삭제됩니다.
    </p>
  </section>

  {#if data.entries.length === 0}
    <Alert>
      <AlertDescription>아직 제출된 감정일기가 없어요.</AlertDescription>
    </Alert>
  {:else}
    {#each data.entries as entry}
      {@const competency = getSelCompetencyForAnswers(entry.answers)}
      <section class="space-y-4 border-b pb-5 last:border-b-0">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="text-lg font-semibold tracking-tight">{entry.entryDate}</h3>
          <Badge
            variant={moodBadgeVariant(entry.moodPrimary)}
            class={moodBadgeClass(entry.moodPrimary)}
          >
            {entry.moodPrimary}
          </Badge>
          {#if getEntryIntensityScore(entry)}
            <Badge variant="outline">{getEntryIntensityScore(entry)}점</Badge>
          {/if}
          {#if competency}
            <Badge variant="outline">{competency.label}</Badge>
          {/if}
        </div>

        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {#each getEmotionAnswerDisplayPairs(entry.answers) as answer}
            <div class="rounded-lg border bg-muted/40 p-3">
              <p class="text-[11px] tracking-wide text-muted-foreground uppercase">
                {answer.label}
              </p>
              <p class="mt-1 text-sm leading-relaxed">{answer.value}</p>
            </div>
          {/each}
        </div>
      </section>
    {/each}
  {/if}
</div>
