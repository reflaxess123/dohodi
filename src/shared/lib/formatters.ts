export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatCurrencyShort(amount: number): string {
  if (Math.abs(amount) >= 1000) {
    return `${(amount / 1000).toFixed(1)}k ₽`
  }
  return `${amount} ₽`
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
  }).format(date)
}

export function formatDateFull(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatMonthShort(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    month: 'short',
  }).format(date)
}

export function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function getDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function parseMonthKey(key: string): Date {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1)
}

export function parseDayKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Salary month: 23rd of month to 22nd of next month
export const SALARY_DAY = 23

/**
 * Get salary month key for a date.
 * If date is before 23rd - it belongs to previous salary month.
 * Format: "2025-12" means salary period Dec 23 - Jan 22
 */
export function getSalaryMonthKey(date: Date): string {
  const day = date.getDate()
  let year = date.getFullYear()
  let month = date.getMonth() + 1 // 1-indexed

  // If before 23rd, this date belongs to the previous salary month
  if (day < SALARY_DAY) {
    month -= 1
    if (month < 1) {
      month = 12
      year -= 1
    }
  }

  return `${year}-${String(month).padStart(2, '0')}`
}

/**
 * Get the start and end dates for a salary month
 */
export function getSalaryMonthRange(salaryMonthKey: string): { start: Date; end: Date } {
  const [year, month] = salaryMonthKey.split('-').map(Number)

  // Start: 23rd of this month
  const start = new Date(year, month - 1, SALARY_DAY)

  // End: 22nd of next month
  let endYear = year
  let endMonth = month + 1
  if (endMonth > 12) {
    endMonth = 1
    endYear += 1
  }
  const end = new Date(endYear, endMonth - 1, 22, 23, 59, 59)

  return { start, end }
}

/**
 * Check if a date falls within a salary month
 */
export function isInSalaryMonth(date: Date, salaryMonthKey: string): boolean {
  const { start, end } = getSalaryMonthRange(salaryMonthKey)
  return date >= start && date <= end
}

/**
 * Get current day within salary month (1-30ish)
 */
export function getSalaryMonthDay(date: Date): number {
  const salaryMonthKey = getSalaryMonthKey(date)
  const { start } = getSalaryMonthRange(salaryMonthKey)
  const diffTime = date.getTime() - start.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays + 1
}

/**
 * Get total days in a salary month
 */
export function getSalaryMonthDays(salaryMonthKey: string): number {
  const { start, end } = getSalaryMonthRange(salaryMonthKey)
  const diffTime = end.getTime() - start.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
}

/**
 * Format salary month for display: "23 дек - 22 янв"
 */
export function formatSalaryMonth(salaryMonthKey: string): string {
  const { start, end } = getSalaryMonthRange(salaryMonthKey)
  const startMonth = new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(start)
  const endMonth = new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(end)
  return `${start.getDate()} ${startMonth} - ${end.getDate()} ${endMonth}`
}
