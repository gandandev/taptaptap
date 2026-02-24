<script lang="ts">
  import { Alert, AlertDescription } from '$lib/components/ui/alert'
  import { Badge, type BadgeVariant } from '$lib/components/ui/badge'
  import { Button } from '$lib/components/ui/button'
  import { EMOTION_TREE } from '$lib/shared/emotion-tree'

  import type { PageProps } from './$types'

  let { data }: PageProps = $props()

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
  <title>{data.student.name} | 학생 감정일기 이력</title>
</svelte:head>

<div class="space-y-4">
  <section class="space-y-3 border-b pb-5">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="space-y-2">
        <Button href="/teacher" variant="outline" size="sm">오늘 목록으로</Button>
        <h2 class="text-2xl font-semibold tracking-tight">{data.student.name}</h2>
        <p class="text-muted-foreground text-sm">학생 코드 {data.student.code}</p>
      </div>
      <Badge variant="outline">기록 {data.entries.length}건</Badge>
    </div>
  </section>

  {#if data.entries.length === 0}
    <Alert>
      <AlertDescription>아직 제출된 감정일기가 없어요.</AlertDescription>
    </Alert>
  {:else}
    {#each data.entries as entry}
      <section class="space-y-4 border-b pb-5 last:border-b-0">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="text-lg font-semibold tracking-tight">{entry.entryDate}</h3>
          <Badge variant={moodBadgeVariant(entry.moodPrimary)} class={moodBadgeClass(entry.moodPrimary)}>
            {entry.moodPrimary}
          </Badge>
        </div>

        <div class="space-y-3">
          {#each entry.answers as answer, i (`${entry.id}-${answer.questionId}-${i}`)}
            <div class="bg-muted/40 rounded-lg border p-3">
              <p class="text-muted-foreground text-[11px] tracking-wide uppercase">
                {EMOTION_TREE[answer.questionId]?.question ?? answer.questionId}
              </p>
              <p class="mt-1 text-sm leading-relaxed">{answer.answer}</p>
            </div>
          {/each}
        </div>
      </section>
    {/each}
  {/if}
</div>
