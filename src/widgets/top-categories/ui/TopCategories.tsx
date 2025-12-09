import { FC } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui'
import { Progress } from '@/shared/ui'
import { useTransactionStore } from '@/entities/transaction'
import { formatCurrency } from '@/shared/lib'

// Map category names for display
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  'НКО': 'Donatepay',
}

interface TopCategoriesProps {
  month?: string
  limit?: number
}

const CATEGORY_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-orange-500',
  'bg-cyan-500',
]

export const TopCategories: FC<TopCategoriesProps> = ({ month, limit = 5 }) => {
  const { getMonthlyData, getCurrentMonthStats } = useTransactionStore()
  const stats = getCurrentMonthStats()
  const monthlyData = getMonthlyData()

  const currentMonth = month || stats.currentMonth
  const data = monthlyData.find(m => m.month === currentMonth)
  const categories = data?.categories.slice(0, limit) || []

  if (categories.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Топ категорий</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">
            Нет данных за этот период
          </div>
        </CardContent>
      </Card>
    )
  }

  const maxAmount = categories[0]?.amount || 1

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Топ категорий</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {categories.map((cat, index) => (
          <div key={cat.name} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="truncate">{CATEGORY_DISPLAY_NAMES[cat.name] || cat.name}</span>
              <span className="text-muted-foreground ml-2 flex-shrink-0">
                {formatCurrency(cat.amount)}
              </span>
            </div>
            <Progress
              value={(cat.amount / maxAmount) * 100}
              indicatorClassName={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
              className="h-2"
            />
            <div className="text-xs text-muted-foreground">
              {cat.count} операций • {cat.percentage.toFixed(1)}%
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
