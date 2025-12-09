import type { Transaction } from '../model/types'
import {
  EXCLUDED_PEOPLE,
  EXCLUDED_DESCRIPTIONS_INCOME,
  EXCLUDED_DESCRIPTIONS_EXPENSE,
  REFUND_KEYWORDS,
  EXPENSE_CATEGORIES,
  DAILY_CATEGORIES,
  MONTHLY_CATEGORIES,
} from '@/shared/config'

export interface FilterResult {
  shouldInclude: boolean
  reason?: string
}

export function filterIncome(tx: Transaction): FilterResult {
  const desc = tx.description.toLowerCase()

  for (const excluded of EXCLUDED_DESCRIPTIONS_INCOME) {
    if (desc.includes(excluded.toLowerCase())) {
      return { shouldInclude: false, reason: `Исключено: ${excluded}` }
    }
  }

  for (const person of EXCLUDED_PEOPLE) {
    if (tx.description.includes(person)) {
      return { shouldInclude: false, reason: `Перевод от ${person}` }
    }
  }

  for (const keyword of REFUND_KEYWORDS) {
    if (desc.includes(keyword)) {
      return { shouldInclude: false, reason: 'Возврат/компенсация' }
    }
  }

  if (EXPENSE_CATEGORIES.includes(tx.category as typeof EXPENSE_CATEGORIES[number])) {
    return { shouldInclude: false, reason: `Возврат в категории ${tx.category}` }
  }

  return { shouldInclude: true }
}

export function filterExpense(tx: Transaction): FilterResult {
  const desc = tx.description.toLowerCase()

  if (tx.category === 'Переводы') {
    if (desc.includes('sovcombank') || desc.includes('совкомбанк')) {
      return { shouldInclude: true }
    }
    return { shouldInclude: false, reason: 'Категория Переводы' }
  }

  for (const excluded of EXCLUDED_DESCRIPTIONS_EXPENSE) {
    if (desc.includes(excluded.toLowerCase()) || tx.description.includes(excluded)) {
      return { shouldInclude: false, reason: excluded }
    }
  }

  for (const person of EXCLUDED_PEOPLE) {
    if (tx.description.includes(person)) {
      return { shouldInclude: false, reason: `Перевод для ${person}` }
    }
  }

  return { shouldInclude: true }
}

export function determinePool(tx: Transaction): Transaction['pool'] {
  if (tx.type === 'income') return 'other'

  const category = tx.category

  if (DAILY_CATEGORIES.includes(category as typeof DAILY_CATEGORIES[number])) {
    return 'daily'
  }

  if (MONTHLY_CATEGORIES.includes(category as typeof MONTHLY_CATEGORIES[number])) {
    return 'monthly'
  }

  const desc = tx.description.toLowerCase()
  if (desc.includes('sovcombank') || desc.includes('совкомбанк')) {
    return 'mandatory'
  }

  return 'other'
}
