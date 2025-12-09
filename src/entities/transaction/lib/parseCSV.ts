import type { RawTransaction, Transaction } from '../model/types'
import { filterIncome, filterExpense, determinePool } from './filterRules'

function parseAmount(str: string): number {
  if (!str) return 0
  const cleaned = str.replace(/\s/g, '').replace(',', '.').replace(/"/g, '')
  return parseFloat(cleaned) || 0
}

function parseDate(str: string): Date {
  const cleaned = str.replace(/"/g, '')
  const [datePart, timePart] = cleaned.split(' ')
  const [day, month, year] = datePart.split('.')
  return new Date(`${year}-${month}-${day}T${timePart || '00:00:00'}`)
}

function generateId(tx: RawTransaction, index: number): string {
  const str = `${tx.operationDate}-${tx.operationAmount}-${tx.description}-${index}`
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ';' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''))
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''))

  return result
}

export async function parseCSV(csvText: string): Promise<Transaction[]> {
  const lines = csvText.split('\n')
  const transactions: Transaction[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = parseCSVLine(line)
    if (values.length < 12) continue

    const raw: RawTransaction = {
      operationDate: values[0],
      paymentDate: values[1],
      cardNumber: values[2],
      status: values[3],
      operationAmount: parseAmount(values[4]),
      operationCurrency: values[5],
      paymentAmount: parseAmount(values[6]),
      paymentCurrency: values[7],
      cashback: values[8],
      category: values[9],
      mcc: values[10],
      description: values[11],
      bonuses: values[12] || '',
      investRounding: values[13] || '',
      amountWithRounding: values[14] || '',
    }

    if (raw.status !== 'OK') continue

    const isExpense = raw.operationAmount < 0
    const tx: Transaction = {
      id: generateId(raw, i),
      date: parseDate(raw.operationDate),
      amount: raw.operationAmount,
      category: raw.category,
      description: raw.description,
      cardNumber: raw.cardNumber,
      mcc: raw.mcc,
      type: isExpense ? 'expense' : 'income',
      isFiltered: false,
      pool: 'other',
    }

    const filterResult = isExpense
      ? filterExpense(tx)
      : filterIncome(tx)

    tx.isFiltered = !filterResult.shouldInclude
    tx.filterReason = filterResult.reason
    tx.pool = determinePool(tx)

    transactions.push(tx)
  }

  return transactions.sort((a, b) => b.date.getTime() - a.date.getTime())
}

export async function loadCSVFromPublic(): Promise<Transaction[]> {
  try {
    const response = await fetch('/123.csv')
    if (!response.ok) {
      throw new Error('Failed to load CSV')
    }
    const text = await response.text()
    return parseCSV(text)
  } catch (error) {
    console.error('Error loading CSV:', error)
    return []
  }
}
