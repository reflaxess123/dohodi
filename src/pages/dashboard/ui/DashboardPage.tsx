import { FC, useEffect } from 'react'
import { BudgetCalculator } from '@/widgets/budget-calculator'
import { BudgetCalendar } from '@/widgets/budget-calendar'
import { useTransactionStore, loadCSVFromPublic } from '@/entities/transaction'

export const DashboardPage: FC = () => {
  const { setTransactions, setLoading, setError, isLoading, transactions } = useTransactionStore()

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const data = await loadCSVFromPublic()
        setTransactions(data)
      } catch (err) {
        setError('Ошибка загрузки данных')
      } finally {
        setLoading(false)
      }
    }

    if (transactions.length === 0) {
      loadData()
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-muted-foreground">Загрузка данных...</div>
      </div>
    )
  }

  return (
    <div className="pb-20 space-y-4">
      <BudgetCalculator />
      <BudgetCalendar />
    </div>
  )
}
