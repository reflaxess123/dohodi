import { FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingDown, TrendingUp, Utensils, Calendar } from 'lucide-react'
import { Card, CardContent } from '@/shared/ui'
import { useTransactionStore } from '@/entities/transaction'
import { formatCurrency, formatSalaryMonth, cn } from '@/shared/lib'

// Map category names for display
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  'НКО': 'Donatepay',
}

const POOL_COLORS = {
  daily: { bg: 'bg-emerald-500', light: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
  monthly: { bg: 'bg-blue-500', light: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
}

export const StatsPage: FC = () => {
  const navigate = useNavigate()
  const { getMonthlyData, getFilteredTransactions, setSelectedMonth } = useTransactionStore()
  const monthlyData = getMonthlyData()
  const transactions = getFilteredTransactions()

  // Pool breakdown
  const dailyTotal = transactions
    .filter(t => t.type === 'expense' && t.pool === 'daily')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const monthlyTotal = transactions
    .filter(t => t.type === 'expense' && t.pool !== 'daily')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const totalExpenses = dailyTotal + monthlyTotal

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  // Monthly comparison (last 6 months)
  const comparisonData = monthlyData
    .slice(0, 6)
    .reverse()
    .map(m => ({
      month: m.month,
      label: formatSalaryMonth(m.month).split(' - ')[0],
      daily: m.dailyPoolSpent,
      monthly: m.monthlyPoolSpent,
      total: m.totalExpenses,
    }))

  const maxMonthTotal = Math.max(...comparisonData.map(m => m.total), 1)

  const handleMonthClick = (month: string) => {
    setSelectedMonth(month)
    navigate(`/month/${month}`)
  }

  // Category stats
  const categoryMap = new Map<string, number>()
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      const current = categoryMap.get(t.category) || 0
      categoryMap.set(t.category, current + Math.abs(t.amount))
    })

  const categoryData = Array.from(categoryMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({
      name: CATEGORY_DISPLAY_NAMES[name] || name,
      value,
      percent: totalExpenses > 0 ? (value / totalExpenses) * 100 : 0,
    }))

  const maxCategoryValue = Math.max(...categoryData.map(c => c.value), 1)

  return (
    <div className="space-y-4 pb-20">
      <h1 className="text-xl font-semibold">Статистика</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30">
                <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <span className="text-xs text-muted-foreground">Расходы</span>
            </div>
            <div className="text-xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(totalExpenses)}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-xs text-muted-foreground">Доходы</span>
            </div>
            <div className="text-xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(totalIncome)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pool Distribution */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium mb-4">Распределение по пулам</h3>

          {/* Visual bar */}
          <div className="h-4 rounded-full overflow-hidden flex mb-4">
            {dailyTotal > 0 && (
              <div
                className={cn(POOL_COLORS.daily.bg, "transition-all")}
                style={{ width: `${(dailyTotal / totalExpenses) * 100}%` }}
              />
            )}
            {monthlyTotal > 0 && (
              <div
                className={cn(POOL_COLORS.monthly.bg, "transition-all")}
                style={{ width: `${(monthlyTotal / totalExpenses) * 100}%` }}
              />
            )}
          </div>

          {/* Pool cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className={cn("rounded-xl p-3", POOL_COLORS.daily.light)}>
              <div className="flex items-center gap-2 mb-1">
                <Utensils className={cn("w-4 h-4", POOL_COLORS.daily.text)} />
                <span className="text-xs font-medium">Еда</span>
              </div>
              <div className={cn("text-lg font-bold", POOL_COLORS.daily.text)}>
                {formatCurrency(dailyTotal)}
              </div>
              <div className="text-xs text-muted-foreground">
                {totalExpenses > 0 ? Math.round((dailyTotal / totalExpenses) * 100) : 0}%
              </div>
            </div>

            <div className={cn("rounded-xl p-3", POOL_COLORS.monthly.light)}>
              <div className="flex items-center gap-2 mb-1">
                <Calendar className={cn("w-4 h-4", POOL_COLORS.monthly.text)} />
                <span className="text-xs font-medium">Ежемесячный</span>
              </div>
              <div className={cn("text-lg font-bold", POOL_COLORS.monthly.text)}>
                {formatCurrency(monthlyTotal)}
              </div>
              <div className="text-xs text-muted-foreground">
                {totalExpenses > 0 ? Math.round((monthlyTotal / totalExpenses) * 100) : 0}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Trend */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium mb-4">Расходы по месяцам</h3>

          <div className="space-y-3">
            {comparisonData.map((m) => (
              <button
                key={m.month}
                onClick={() => handleMonthClick(m.month)}
                className="w-full text-left group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                    {m.label}
                  </span>
                  <span className="text-xs font-medium">
                    {formatCurrency(m.total)}
                  </span>
                </div>
                <div className="h-6 rounded-lg overflow-hidden flex bg-muted/50">
                  {m.daily > 0 && (
                    <div
                      className={cn(POOL_COLORS.daily.bg, "transition-all group-hover:opacity-80")}
                      style={{ width: `${(m.daily / maxMonthTotal) * 100}%` }}
                    />
                  )}
                  {m.monthly > 0 && (
                    <div
                      className={cn(POOL_COLORS.monthly.bg, "transition-all group-hover:opacity-80")}
                      style={{ width: `${(m.monthly / maxMonthTotal) * 100}%` }}
                    />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t">
            <div className="flex items-center gap-1.5">
              <div className={cn("w-3 h-3 rounded", POOL_COLORS.daily.bg)} />
              <span className="text-xs text-muted-foreground">Еда</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={cn("w-3 h-3 rounded", POOL_COLORS.monthly.bg)} />
              <span className="text-xs text-muted-foreground">Ежемесячный</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Categories */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium mb-4">Топ категорий</h3>

          <div className="space-y-3">
            {categoryData.map((cat, index) => (
              <div key={cat.name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground w-4">
                      {index + 1}
                    </span>
                    <span className="text-sm truncate">{cat.name}</span>
                  </div>
                  <span className="text-sm font-medium">
                    {formatCurrency(cat.value)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all"
                      style={{ width: `${(cat.value / maxCategoryValue) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-10 text-right">
                    {cat.percent.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
