import { FC } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/shared/ui'
import { BudgetCalendar } from '@/widgets/budget-calendar'
import { TopCategories } from '@/widgets/top-categories'
import { useTransactionStore } from '@/entities/transaction'
import { formatCurrency, formatMonth, parseMonthKey, parseDayKey } from '@/shared/lib'

export const MonthlyPage: FC = () => {
  const { id: monthId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getDailyData, setSelectedDay } = useTransactionStore()

  if (!monthId) {
    navigate('/')
    return null
  }

  const dailyData = getDailyData(monthId)
  const monthDate = parseMonthKey(monthId)

  const chartData = dailyData
    .slice()
    .reverse()
    .map(d => ({
      date: d.date,
      day: parseDayKey(d.date).getDate(),
      expenses: d.expenses,
      daily: d.dailyPoolSpent,
    }))

  const handleDayClick = (data: { date: string }) => {
    setSelectedDay(data.date)
    navigate(`/day/${data.date}`)
  }

  const totalExpenses = dailyData.reduce((sum, d) => sum + d.expenses, 0)
  const avgDaily = dailyData.length > 0 ? totalExpenses / dailyData.length : 0

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold capitalize">
          {formatMonth(monthDate)}
        </h1>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
              <div className="text-sm text-muted-foreground">Всего расходов</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{formatCurrency(avgDaily)}</div>
              <div className="text-sm text-muted-foreground">В среднем/день</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <BudgetCalendar month={monthId} />

      {/* Daily chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Расходы по дням</CardTitle>
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
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar
                  dataKey="expenses"
                  radius={[2, 2, 0, 0]}
                  cursor="pointer"
                  onClick={(data) => handleDayClick(data)}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.expenses > 3000
                          ? 'hsl(0 84% 60%)'
                          : entry.expenses > 1500
                          ? 'hsl(45 93% 47%)'
                          : 'hsl(142 76% 36%)'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top categories */}
      <TopCategories month={monthId} />
    </div>
  )
}
