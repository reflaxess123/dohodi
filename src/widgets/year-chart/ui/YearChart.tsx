import { FC } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui'
import { useTransactionStore } from '@/entities/transaction'
import { formatCurrency, formatMonthShort, parseMonthKey } from '@/shared/lib'

export const YearChart: FC = () => {
  const navigate = useNavigate()
  const { getMonthlyData, setSelectedMonth } = useTransactionStore()
  const monthlyData = getMonthlyData()

  const chartData = monthlyData
    .slice(0, 12)
    .reverse()
    .map(m => ({
      month: m.month,
      label: formatMonthShort(parseMonthKey(m.month)),
      expenses: m.totalExpenses,
      daily: m.dailyPoolSpent,
      monthly: m.monthlyPoolSpent,
    }))

  const handleClick = (data: { month: string }) => {
    setSelectedMonth(data.month)
    navigate(`/month/${data.month}`)
  }

  const maxValue = Math.max(...chartData.map(d => d.expenses))

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Расходы по месяцам</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11 }}
              />
              <YAxis hide />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => `${label}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar
                dataKey="expenses"
                radius={[4, 4, 0, 0]}
                cursor="pointer"
                onClick={(data) => handleClick(data)}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.expenses > maxValue * 0.8
                        ? 'hsl(0 84% 60%)'
                        : entry.expenses > maxValue * 0.5
                        ? 'hsl(45 93% 47%)'
                        : 'hsl(142 76% 36%)'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="text-xs text-center text-muted-foreground mt-2">
          Нажмите на столбец для детализации
        </div>
      </CardContent>
    </Card>
  )
}
