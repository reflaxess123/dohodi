import { FC } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/shared/ui'
import { useTransactionStore } from '@/entities/transaction'
import { formatCurrency, formatDateFull, parseDayKey, getDayKey } from '@/shared/lib'

const COLORS = [
  'hsl(221, 83%, 53%)',
  'hsl(142, 76%, 36%)',
  'hsl(45, 93%, 47%)',
  'hsl(280, 65%, 60%)',
  'hsl(350, 89%, 60%)',
  'hsl(199, 89%, 48%)',
  'hsl(24, 94%, 50%)',
]

export const DailyPage: FC = () => {
  const { id: dayId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getFilteredTransactions, budget } = useTransactionStore()

  if (!dayId) {
    navigate('/')
    return null
  }

  const dayDate = parseDayKey(dayId)
  const transactions = getFilteredTransactions()
    .filter(t => getDayKey(t.date) === dayId && t.type === 'expense')
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))

  // Group by category
  const categoryMap = new Map<string, number>()
  transactions.forEach(t => {
    const current = categoryMap.get(t.category) || 0
    categoryMap.set(t.category, current + Math.abs(t.amount))
  })

  const pieData = Array.from(categoryMap.entries()).map(([name, value]) => ({
    name,
    value,
  }))

  const totalExpenses = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const dailyTarget = budget.dailyTarget
  const diff = dailyTarget - totalExpenses

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">
          {formatDateFull(dayDate)}
        </h1>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xl font-bold">{formatCurrency(totalExpenses)}</div>
              <div className="text-xs text-muted-foreground">Потрачено</div>
            </div>
            <div>
              <div className="text-xl font-bold">{formatCurrency(dailyTarget)}</div>
              <div className="text-xs text-muted-foreground">Цель</div>
            </div>
            <div>
              <div className={`text-xl font-bold ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
              </div>
              <div className="text-xs text-muted-foreground">Разница</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pie chart */}
      {pieData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">По категориям</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend
                    formatter={(value) => <span className="text-xs">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            Операции ({transactions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {transactions.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              Нет операций за этот день
            </div>
          ) : (
            transactions.map(t => (
              <div
                key={t.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{t.description}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-xs">
                      {t.category}
                    </Badge>
                    <Badge
                      variant={t.pool === 'daily' ? 'default' : 'outline'}
                      className="text-xs"
                    >
                      {t.pool === 'daily' ? 'Еда' : 'Месяц'}
                    </Badge>
                  </div>
                </div>
                <div className="text-right ml-3">
                  <div className="font-semibold text-red-600">
                    {formatCurrency(Math.abs(t.amount))}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
