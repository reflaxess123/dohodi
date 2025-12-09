import { FC } from 'react'
import { Badge } from '@/shared/ui'
import { useTransactionStore } from '@/entities/transaction'
import type { Transaction } from '@/entities/transaction'
import { formatCurrency, formatDate, formatSalaryMonth } from '@/shared/lib'

// Map category names for display
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  'НКО': 'Donatepay',
}

// Only two pools: daily (food) and monthly (everything else)
const POOL_LABELS: Record<string, { label: string; color: string }> = {
  daily: { label: 'Еда', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  monthly: { label: 'Месяц', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  mandatory: { label: 'Месяц', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  other: { label: 'Месяц', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
}

interface DaySummary {
  dailySpent: number
  monthlySpent: number
  totalSpent: number
}

function calculateDaySummary(transactions: Transaction[]): DaySummary {
  const expenses = transactions.filter(t => t.type === 'expense')
  return {
    dailySpent: expenses.filter(t => t.pool === 'daily').reduce((sum, t) => sum + Math.abs(t.amount), 0),
    // Monthly includes monthly, mandatory, and other pools
    monthlySpent: expenses.filter(t => t.pool !== 'daily').reduce((sum, t) => sum + Math.abs(t.amount), 0),
    totalSpent: expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0),
  }
}

export const TransactionList: FC = () => {
  const { getCurrentMonthStats, getCurrentMonthTransactions } = useTransactionStore()
  const stats = getCurrentMonthStats()
  const transactions = getCurrentMonthTransactions()

  // Group by date
  const groupedByDate = transactions.reduce((acc, tx) => {
    const dateStr = formatDate(tx.date)
    if (!acc[dateStr]) {
      acc[dateStr] = []
    }
    acc[dateStr].push(tx)
    return acc
  }, {} as Record<string, typeof transactions>)

  const dates = Object.keys(groupedByDate)

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-4">
        <div className="text-sm text-muted-foreground">
          {formatSalaryMonth(stats.currentMonth)} • {transactions.length} операций
        </div>
      </div>

      {/* Transactions list */}
      <div className="space-y-4">
        {dates.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            Нет транзакций за этот период
          </div>
        ) : (
          dates.map(dateStr => {
            const dayTransactions = groupedByDate[dateStr]
            const summary = calculateDaySummary(dayTransactions)

            return (
              <div key={dateStr} className="rounded-lg border bg-card overflow-hidden">
                {/* Day header with summary */}
                <div className="bg-muted/50 px-4 py-3 border-b">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{dateStr}</span>
                    <span className="font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(summary.totalSpent)}
                    </span>
                  </div>
                  {/* Pool breakdown - only two pools */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {summary.dailySpent > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Еда: {formatCurrency(summary.dailySpent)}
                      </span>
                    )}
                    {summary.monthlySpent > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        Месяц: {formatCurrency(summary.monthlySpent)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Transactions */}
                <div className="divide-y">
                  {dayTransactions.map(tx => {
                    const poolInfo = POOL_LABELS[tx.pool]
                    const displayCategory = CATEGORY_DISPLAY_NAMES[tx.category] || tx.category

                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {tx.description}
                            </span>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] px-1.5 py-0 ${poolInfo.color}`}
                            >
                              {poolInfo.label}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {displayCategory}
                          </div>
                        </div>
                        <div className="text-sm font-medium text-red-600 dark:text-red-400 ml-2">
                          {formatCurrency(Math.abs(tx.amount))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
