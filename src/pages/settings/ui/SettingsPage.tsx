import { FC } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/shared/ui'
import { useTransactionStore } from '@/entities/transaction'
import { formatCurrency } from '@/shared/lib'
import { BUDGET_CONFIG } from '@/shared/config'

export const SettingsPage: FC = () => {
  const { budget, updateBudget, transactions, getCurrentMonthStats } = useTransactionStore()
  const stats = getCurrentMonthStats()

  const filteredCount = transactions.filter(t => !t.isFiltered).length
  const totalCount = transactions.length

  const handleResetBudget = () => {
    updateBudget({
      income: BUDGET_CONFIG.income,
      mandatory: { ...BUDGET_CONFIG.mandatory },
      dailyTarget: BUDGET_CONFIG.dailyTarget,
      totalDebt: BUDGET_CONFIG.totalDebt,
    })
  }

  const mandatoryTotal = Object.values(budget.mandatory).reduce((a, b) => a + b, 0)
  const daysInMonth = stats.daysInMonth
  const dailyPool = budget.dailyTarget * daysInMonth
  const monthlyPool = budget.income - mandatoryTotal - dailyPool

  return (
    <div className="space-y-4 pb-20">
      <h1 className="text-xl font-semibold">Настройки</h1>

      {/* Budget overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Структура бюджета</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span>Доход</span>
            <span className="font-semibold">{formatCurrency(budget.income)}</span>
          </div>

          <div className="border-t pt-3 space-y-2">
            <div className="text-sm text-muted-foreground">Обязательные платежи:</div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">БЭТМЕН</span>
              <span>{formatCurrency(budget.mandatory.batman)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Claude Code</span>
              <span>{formatCurrency(budget.mandatory.claudeCode)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Погашение долга</span>
              <span>{formatCurrency(budget.mandatory.debtPayment)}</span>
            </div>
            <div className="flex justify-between font-medium pt-1 border-t">
              <span>Итого обязательные</span>
              <span>{formatCurrency(mandatoryTotal)}</span>
            </div>
          </div>

          <div className="border-t pt-3 space-y-2">
            <div className="flex justify-between">
              <span>Ежедневный пул (еда)</span>
              <span className="font-semibold">{formatCurrency(dailyPool)}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              ~{formatCurrency(budget.dailyTarget)}/день × {daysInMonth} дней
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="flex justify-between">
              <span>Ежемесячный пул</span>
              <span className="font-semibold">{formatCurrency(monthlyPool)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debt info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Долг</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span>Общий долг</span>
            <span className="font-semibold text-red-600">
              {formatCurrency(budget.totalDebt)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Погашено</span>
            <span className="font-semibold text-green-600">
              {formatCurrency(budget.paidDebt)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Осталось</span>
            <span className="font-semibold">
              {formatCurrency(budget.totalDebt - budget.paidDebt)}
            </span>
          </div>
          <div className="text-xs text-muted-foreground pt-2">
            При {formatCurrency(budget.mandatory.debtPayment)}/мес закроется через{' '}
            {Math.ceil((budget.totalDebt - budget.paidDebt) / budget.mandatory.debtPayment)} мес.
          </div>
        </CardContent>
      </Card>

      {/* Data stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Данные</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Всего операций</span>
            <span>{totalCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>После фильтрации</span>
            <span>{filteredCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Отфильтровано</span>
            <span className="text-muted-foreground">{totalCount - filteredCount}</span>
          </div>
        </CardContent>
      </Card>

      {/* Reset button */}
      <Button variant="outline" className="w-full" onClick={handleResetBudget}>
        Сбросить настройки
      </Button>
    </div>
  )
}
