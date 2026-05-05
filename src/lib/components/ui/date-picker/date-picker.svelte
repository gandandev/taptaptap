<script lang="ts">
  import CalendarDays from '@lucide/svelte/icons/calendar-days'
  import ChevronLeft from '@lucide/svelte/icons/chevron-left'
  import ChevronRight from '@lucide/svelte/icons/chevron-right'

  import { Button } from '$lib/components/ui/button'
  import { cn } from '$lib/utils'

  type CalendarDay = {
    isoDate: string
    day: number
    isCurrentMonth: boolean
    isSelected: boolean
    isToday: boolean
    isDisabled: boolean
  }

  type Props = {
    value: string
    min?: string
    max?: string
    label?: string
    class?: string
    onSelect?: (date: string) => void
  }

  let { value, min, max, label = '날짜 선택', class: className, onSelect }: Props = $props()

  let open = $state(false)
  let rootElement = $state<HTMLElement | null>(null)
  let viewYear = $state(0)
  let viewMonthIndex = $state(0)
  let syncedValue = $state('')

  const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토']

  const selectedDate = $derived(parseIsoDate(value) ?? todayUtcDate())
  const maxDate = $derived(max ? parseIsoDate(max) : null)
  const minDate = $derived(min ? parseIsoDate(min) : null)
  const monthLabel = $derived(
    viewYear > 0 ? `${viewYear}년 ${String(viewMonthIndex + 1).padStart(2, '0')}월` : ''
  )
  const selectedDateLabel = $derived(formatKoreanDate(value))
  const calendarDays = $derived(buildCalendarDays(viewYear, viewMonthIndex))
  const isPreviousMonthDisabled = $derived(
    minDate ? getLastDayOfMonthIso(viewYear, viewMonthIndex - 1) < toIsoDate(minDate) : false
  )
  const isNextMonthDisabled = $derived(
    maxDate ? getFirstDayOfMonthIso(viewYear, viewMonthIndex + 1) > toIsoDate(maxDate) : false
  )

  $effect(() => {
    if (syncedValue === value) return

    syncedValue = value
    viewYear = selectedDate.getUTCFullYear()
    viewMonthIndex = selectedDate.getUTCMonth()
  })

  function parseIsoDate(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null

    const parsedDate = new Date(`${date}T00:00:00.000Z`)

    if (Number.isNaN(parsedDate.getTime())) return null
    if (parsedDate.toISOString().slice(0, 10) !== date) return null

    return parsedDate
  }

  function todayUtcDate() {
    const today = new Date()

    return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
  }

  function toIsoDate(date: Date) {
    return date.toISOString().slice(0, 10)
  }

  function addUtcDays(date: Date, days: number) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days))
  }

  function getFirstDayOfMonthIso(year: number, monthIndex: number) {
    return toIsoDate(new Date(Date.UTC(year, monthIndex, 1)))
  }

  function getLastDayOfMonthIso(year: number, monthIndex: number) {
    return toIsoDate(new Date(Date.UTC(year, monthIndex + 1, 0)))
  }

  function formatKoreanDate(date: string) {
    const parsedDate = parseIsoDate(date)
    if (!parsedDate) return '날짜 선택'

    const weekday = weekdayLabels[parsedDate.getUTCDay()]

    return `${parsedDate.getUTCFullYear()}년 ${parsedDate.getUTCMonth() + 1}월 ${parsedDate.getUTCDate()}일 (${weekday})`
  }

  function isDisabledDate(isoDate: string) {
    if (min && isoDate < min) return true
    if (max && isoDate > max) return true

    return false
  }

  function buildCalendarDays(year: number, monthIndex: number): CalendarDay[] {
    if (year <= 0) return []

    const firstDate = new Date(Date.UTC(year, monthIndex, 1))
    const startDate = addUtcDays(firstDate, -firstDate.getUTCDay())
    const todayIso = max ?? toIsoDate(todayUtcDate())

    return Array.from({ length: 42 }, (_, index) => {
      const date = addUtcDays(startDate, index)
      const isoDate = toIsoDate(date)

      return {
        isoDate,
        day: date.getUTCDate(),
        isCurrentMonth: date.getUTCMonth() === monthIndex,
        isSelected: isoDate === value,
        isToday: isoDate === todayIso,
        isDisabled: isDisabledDate(isoDate)
      }
    })
  }

  function moveMonth(offset: number) {
    const nextMonth = new Date(Date.UTC(viewYear, viewMonthIndex + offset, 1))

    viewYear = nextMonth.getUTCFullYear()
    viewMonthIndex = nextMonth.getUTCMonth()
  }

  function selectDate(date: CalendarDay) {
    if (date.isDisabled) return

    onSelect?.(date.isoDate)
    open = false
  }

  function handleWindowClick(event: MouseEvent) {
    if (!open) return
    if (event.target instanceof Node && rootElement?.contains(event.target)) return

    open = false
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (!open || event.key !== 'Escape') return

    open = false
  }
</script>

<svelte:window onclick={handleWindowClick} onkeydown={handleWindowKeydown} />

<div bind:this={rootElement} class={cn('relative', className)}>
  <Button
    type="button"
    variant="outline"
    class="h-10 w-full justify-start rounded-xl bg-transparent px-3 text-left font-medium sm:w-[17rem]"
    aria-label={label}
    aria-expanded={open}
    onclick={() => (open = !open)}
  >
    <CalendarDays class="size-4 text-muted-foreground" />
    <span class="min-w-0 truncate">{selectedDateLabel}</span>
  </Button>

  {#if open}
    <div
      class="absolute right-0 z-20 mt-2 w-[min(20rem,calc(100vw-2.5rem))] rounded-xl border bg-popover p-3 text-popover-foreground shadow-xl"
      role="dialog"
      aria-label={label}
    >
      <div class="mb-3 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          class="rounded-lg"
          disabled={isPreviousMonthDisabled}
          aria-label="이전 달"
          onclick={() => moveMonth(-1)}
        >
          <ChevronLeft class="size-4" />
        </Button>
        <div class="text-sm font-semibold text-primary">{monthLabel}</div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          class="rounded-lg"
          disabled={isNextMonthDisabled}
          aria-label="다음 달"
          onclick={() => moveMonth(1)}
        >
          <ChevronRight class="size-4" />
        </Button>
      </div>

      <div class="grid grid-cols-7 gap-1">
        {#each weekdayLabels as weekday (weekday)}
          <div
            class="flex h-7 items-center justify-center text-xs font-semibold text-muted-foreground"
          >
            {weekday}
          </div>
        {/each}

        {#each calendarDays as date (date.isoDate)}
          <button
            type="button"
            class={cn(
              'flex size-9 items-center justify-center rounded-lg text-sm font-medium transition-colors',
              date.isSelected
                ? 'bg-primary text-primary-foreground hover:bg-primary'
                : 'hover:bg-accent hover:text-accent-foreground',
              !date.isCurrentMonth && 'text-muted-foreground/40',
              date.isToday && !date.isSelected && 'ring-1 ring-border',
              date.isDisabled && 'pointer-events-none opacity-30'
            )}
            disabled={date.isDisabled}
            aria-pressed={date.isSelected}
            aria-label={formatKoreanDate(date.isoDate)}
            onclick={() => selectDate(date)}
          >
            {date.day}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>
