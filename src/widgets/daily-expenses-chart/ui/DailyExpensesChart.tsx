import { FC } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui'
import { useTransactionStore } from '@/entities/transaction'
import { formatCurrency, formatSalaryMonth, getSalaryMonthRange } from '@/shared/lib'

export const DailyExpensesChart: FC = () => {
  const { getCurrentMonthStats, getDailyData, budget } = useTransactionStore()
  const stats = getCurrentMonthStats()
  const dailyData = getDailyData(stats.currentMonth)

  const { start, end } = getSalaryMonthRange(stats.currentMonth)

  // Create chart data for all days in salary month
  const chartData: { day: number; date: string; spent: number; isToday: boolean }[] = []

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const dayData = dailyData.find(dd => dd.date === dayKey)
    const dayNum = Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

    chartData.push({
      day: dayNum,
      date: dayKey,
      spent: dayData?.dailyPoolSpent || 0,
      isToday: dayNum === stats.currentDay,
    })
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">
          Расходы по дням
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          {formatSalaryMonth(stats.currentMonth)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10 }}
                interval={4}
              />
              <YAxis hide />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(day) => `День ${day}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <ReferenceLine
                y={budget.dailyTarget}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="3 3"
              />
              <Bar
                dataKey="spent"
                radius={[2, 2, 0, 0]}
                fill="hsl(221, 83%, 53%)"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="text-xs text-center text-muted-foreground mt-2">
          Пунктир — цель {formatCurrency(budget.dailyTarget)}/день
        </div>
      </CardContent>
    </Card>
  )
}
