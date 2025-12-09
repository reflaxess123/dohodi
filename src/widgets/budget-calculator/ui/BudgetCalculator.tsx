import { FC } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui'
import { Progress } from '@/shared/ui'
import { Slider } from '@/shared/ui'
import { useTransactionStore } from '@/entities/transaction'
import { formatCurrency, formatSalaryMonth, cn } from '@/shared/lib'

export const BudgetCalculator: FC = () => {
  const { getCurrentMonthStats, getMonthlyData, budget, updateBudget } = useTransactionStore()
  const stats = getCurrentMonthStats()

  // Pool budgets from store - adjustable via sliders
  const foodPoolBudget = budget.foodPoolBudget
  const monthlyPoolBudget = budget.monthlyPoolBudget

  const setFoodPoolBudget = (value: number) => updateBudget({ foodPoolBudget: value })
  const setMonthlyPoolBudget = (value: number) => updateBudget({ monthlyPoolBudget: value })

  // Get real data from current month transactions
  const monthlyData = getMonthlyData()
  const currentMonthData = monthlyData.find(m => m.month === stats.currentMonth)
  const realIncome = currentMonthData?.totalIncome || 0

  // Total planned budget from pools
  const totalPlannedBudget = foodPoolBudget + monthlyPoolBudget

  // Remainder = income - planned pools (can be negative = deficit, positive = surplus for debt)
  const remainder = realIncome - totalPlannedBudget

  // How much of each pool is spent
  const foodPoolSpent = stats.dailyPoolSpent
  const monthlyPoolSpent = stats.monthlyPoolSpent

  // Remaining in each pool
  const foodPoolRemaining = foodPoolBudget - foodPoolSpent
  const monthlyPoolRemaining = monthlyPoolBudget - monthlyPoolSpent

  // Daily budget from food pool
  const effectiveDailyBudget = foodPoolRemaining / Math.max(1, stats.daysRemaining)

  // Progress: how much of the month has passed
  const daysPercentPassed = (stats.currentDay / stats.daysInMonth) * 100

  // Progress percentages for pools
  const foodPoolPercentUsed = (foodPoolSpent / foodPoolBudget) * 100
  const monthlyPoolPercentUsed = (monthlyPoolSpent / monthlyPoolBudget) * 100

  const getBudgetStatus = (budget: number) => {
    if (budget >= 1200) return { color: 'bg-green-500', label: 'Норма', variant: 'success' as const }
    if (budget >= 800) return { color: 'bg-yellow-500', label: 'Внимание', variant: 'warning' as const }
    return { color: 'bg-red-500', label: 'Критично', variant: 'danger' as const }
  }

  const status = getBudgetStatus(effectiveDailyBudget)

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-muted-foreground">
          Можно тратить сегодня
        </CardTitle>
        <div className="text-xs text-muted-foreground">
          {formatSalaryMonth(stats.currentMonth)} • День {stats.currentDay} из {stats.daysInMonth}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main daily budget */}
        <div className="text-center">
          <div className={`text-4xl font-bold ${
            status.variant === 'success' ? 'text-green-600' :
            status.variant === 'warning' ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {formatCurrency(Math.round(effectiveDailyBudget))}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            в день на еду
          </div>
        </div>

        {/* Days remaining progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Дней осталось</span>
            <span className="font-medium">{stats.daysRemaining} из {stats.daysInMonth}</span>
          </div>
          <Progress
            value={daysPercentPassed}
            indicatorClassName="bg-gray-500"
          />
        </div>

        {/* Food pool slider */}
        <div className="space-y-3 pt-3 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Пул на еду</span>
            <span className="text-sm font-bold text-green-600 dark:text-green-400">
              {formatCurrency(foodPoolBudget)}
            </span>
          </div>
          <Slider
            value={[foodPoolBudget]}
            onValueChange={([value]) => setFoodPoolBudget(value)}
            min={40000}
            max={70000}
            step={1000}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>40 000 ₽</span>
            <span>70 000 ₽</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>потрачено {formatCurrency(foodPoolSpent)}</span>
            <span className={cn(
              "font-medium",
              foodPoolRemaining < 0 ? "text-red-600" : "text-green-600"
            )}>
              осталось {formatCurrency(foodPoolRemaining)}
            </span>
          </div>
          <Progress
            value={Math.min(foodPoolPercentUsed, 100)}
            indicatorClassName={foodPoolPercentUsed > 90 ? 'bg-red-500' : foodPoolPercentUsed > 70 ? 'bg-yellow-500' : 'bg-green-500'}
          />
        </div>

        {/* Monthly pool slider */}
        <div className="space-y-3 pt-3 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Ежемесячный пул</span>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(monthlyPoolBudget)}
            </span>
          </div>
          <Slider
            value={[monthlyPoolBudget]}
            onValueChange={([value]) => setMonthlyPoolBudget(value)}
            min={40000}
            max={50000}
            step={1000}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>40 000 ₽</span>
            <span>50 000 ₽</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>потрачено {formatCurrency(monthlyPoolSpent)}</span>
            <span className={cn(
              "font-medium",
              monthlyPoolRemaining < 0 ? "text-red-600" : "text-blue-600"
            )}>
              осталось {formatCurrency(monthlyPoolRemaining)}
            </span>
          </div>
          <Progress
            value={Math.min(monthlyPoolPercentUsed, 100)}
            indicatorClassName={monthlyPoolPercentUsed > 90 ? 'bg-red-500' : monthlyPoolPercentUsed > 70 ? 'bg-yellow-500' : 'bg-blue-500'}
          />
        </div>

        {/* Remainder - result of pool allocation */}
        <div className="pt-3 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Остаток (на долг/накопления)</span>
            <span className={cn(
              "font-bold text-lg",
              remainder < 0 ? "text-red-600" : "text-purple-600"
            )}>
              {remainder >= 0 ? '+' : ''}{formatCurrency(remainder)}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            доход {formatCurrency(realIncome)} − пулы {formatCurrency(totalPlannedBudget)}
          </div>
          {remainder < 0 && (
            <div className="text-xs bg-red-50 dark:bg-red-950 p-2 rounded text-red-600 dark:text-red-400">
              ⚠️ Дефицит! Уменьшите пулы на {formatCurrency(Math.abs(remainder))}
            </div>
          )}
          {remainder > 0 && (
            <div className="text-xs bg-green-50 dark:bg-green-950 p-2 rounded text-green-600 dark:text-green-400">
              ✓ Можно закрыть {formatCurrency(remainder)} долга или отложить
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
