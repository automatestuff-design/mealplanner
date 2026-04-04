/**
 * Returns the Monday of the week containing the given date.
 * The returned date has its time set to midnight UTC.
 */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date)
  const day = d.getUTCDay()
  const daysToMonday = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + daysToMonday)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

/**
 * Returns an array of 7 Date objects for the week starting on the given Monday.
 */
export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setUTCDate(d.getUTCDate() + i)
    return d
  })
}

/**
 * Formats a Date to an ISO date string (YYYY-MM-DD) in UTC.
 */
export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Parses an ISO date string to a Date at midnight UTC.
 */
export function fromISODate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`)
}

/**
 * Returns a human-readable label for a date, e.g. "Mon 7" or "Today".
 */
export function formatDayLabel(date: Date, today: Date = new Date()): string {
  const isoDate = toISODate(date)
  const isoToday = toISODate(today)

  if (isoDate === isoToday) return 'Today'

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return `${dayNames[date.getUTCDay()]} ${date.getUTCDate()}`
}

/**
 * Formats a week range like "Apr 7 – Apr 13, 2026".
 */
export function formatWeekRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)

  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' }
  const start = weekStart.toLocaleDateString('en-US', opts)
  const end = weekEnd.toLocaleDateString('en-US', { ...opts, year: 'numeric' })

  return `${start} – ${end}`
}
