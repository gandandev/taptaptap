export const APP_TIME_ZONE = 'Asia/Seoul'

export function formatDateInTimeZone(date: Date, timeZone = APP_TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })

  const parts = formatter.formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  if (!year || !month || !day) {
    throw new Error('Failed to format date')
  }

  return `${year}-${month}-${day}`
}

export function todayDateInKst() {
  return formatDateInTimeZone(new Date(), APP_TIME_ZONE)
}
