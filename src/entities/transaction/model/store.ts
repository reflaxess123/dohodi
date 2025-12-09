import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Transaction, BudgetState, MonthlyData, DailyData, CategoryData } from './types'
import { BUDGET_CONFIG } from '@/shared/config'
import {
  getSalaryMonthKey,
  getSalaryMonthDay,
  getSalaryMonthDays,
  isInSalaryMonth,
  getDayKey,
} from '@/shared/lib'

interface TransactionState {
  transactions: Transaction[]
  isLoading: boolean
  error: string | null

  budget: BudgetState

  selectedMonth: string | null
  selectedDay: string | null

  setTransactions: (transactions: Transaction[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSelectedMonth: (month: string | null) => void
  setSelectedDay: (day: string | null) => void
  updateBudget: (budget: Partial<BudgetState>) => void

  getFilteredTransactions: () => Transaction[]
  getMonthlyData: () => MonthlyData[]
  getDailyData: (month: string) => DailyData[]
  getCategoryData: (transactions: Transaction[]) => CategoryData[]
  getCurrentMonthStats: () => {
    dailyPoolSpent: number
    monthlyPoolSpent: number
    mandatorySpent: number
    daysRemaining: number
    dailyBudget: number
    currentMonth: string
    currentDay: number
    daysInMonth: number
  }
  getCurrentMonthTransactions: () => Transaction[]
}

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set, get) => ({
      transactions: [],
      isLoading: false,
      error: null,

      budget: {
        income: BUDGET_CONFIG.income,
        mandatory: { ...BUDGET_CONFIG.mandatory },
        dailyTarget: BUDGET_CONFIG.dailyTarget,
        totalDebt: BUDGET_CONFIG.totalDebt,
        paidDebt: 0,
        foodPoolBudget: 50000,
        monthlyPoolBudget: 40000,
      },

      selectedMonth: null,
      selectedDay: null,

      setTransactions: (transactions) => set({ transactions }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setSelectedMonth: (month) => set({ selectedMonth: month, selectedDay: null }),
      setSelectedDay: (day) => set({ selectedDay: day }),
      updateBudget: (budget) => set((state) => ({
        budget: { ...state.budget, ...budget }
      })),

      getFilteredTransactions: () => {
        const { transactions } = get()
        return transactions.filter(t => !t.isFiltered)
      },

      // Use salary month (23rd to 22nd)
      getMonthlyData: () => {
        const filtered = get().getFilteredTransactions()
        const monthMap = new Map<string, Transaction[]>()

        filtered.forEach(tx => {
          const key = getSalaryMonthKey(tx.date)
          if (!monthMap.has(key)) {
            monthMap.set(key, [])
          }
          monthMap.get(key)!.push(tx)
        })

        const result: MonthlyData[] = []
        monthMap.forEach((txs, month) => {
          const expenses = txs.filter(t => t.type === 'expense')
          const income = txs.filter(t => t.type === 'income')

          result.push({
            month,
            totalExpenses: expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0),
            totalIncome: income.reduce((sum, t) => sum + t.amount, 0),
            dailyPoolSpent: expenses
              .filter(t => t.pool === 'daily')
              .reduce((sum, t) => sum + Math.abs(t.amount), 0),
            // Monthly pool includes all non-daily expenses (monthly, mandatory, other)
            monthlyPoolSpent: expenses
              .filter(t => t.pool !== 'daily')
              .reduce((sum, t) => sum + Math.abs(t.amount), 0),
            mandatorySpent: expenses
              .filter(t => t.pool === 'mandatory')
              .reduce((sum, t) => sum + Math.abs(t.amount), 0),
            categories: get().getCategoryData(expenses),
          })
        })

        return result.sort((a, b) => b.month.localeCompare(a.month))
      },

      // Get daily data for salary month
      getDailyData: (salaryMonth: string) => {
        const filtered = get().getFilteredTransactions()
        const dayMap = new Map<string, Transaction[]>()

        filtered
          .filter(tx => isInSalaryMonth(tx.date, salaryMonth))
          .forEach(tx => {
            const key = getDayKey(tx.date)
            if (!dayMap.has(key)) {
              dayMap.set(key, [])
            }
            dayMap.get(key)!.push(tx)
          })

        const result: DailyData[] = []
        dayMap.forEach((txs, date) => {
          const expenses = txs.filter(t => t.type === 'expense')
          const income = txs.filter(t => t.type === 'income')

          result.push({
            date,
            expenses: expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0),
            income: income.reduce((sum, t) => sum + t.amount, 0),
            dailyPoolSpent: expenses
              .filter(t => t.pool === 'daily')
              .reduce((sum, t) => sum + Math.abs(t.amount), 0),
            categories: get().getCategoryData(expenses),
          })
        })

        return result.sort((a, b) => b.date.localeCompare(a.date))
      },

      getCategoryData: (transactions: Transaction[]) => {
        const categoryMap = new Map<string, { amount: number; count: number }>()

        transactions.forEach(tx => {
          const current = categoryMap.get(tx.category) || { amount: 0, count: 0 }
          categoryMap.set(tx.category, {
            amount: current.amount + Math.abs(tx.amount),
            count: current.count + 1,
          })
        })

        const total = Array.from(categoryMap.values())
          .reduce((sum, c) => sum + c.amount, 0)

        const result: CategoryData[] = []
        categoryMap.forEach((data, name) => {
          result.push({
            name,
            amount: data.amount,
            percentage: total > 0 ? (data.amount / total) * 100 : 0,
            count: data.count,
          })
        })

        return result.sort((a, b) => b.amount - a.amount)
      },

      getCurrentMonthStats: () => {
        const { budget } = get()
        const filtered = get().getFilteredTransactions()

        // Find the most recent salary month from transactions
        let currentMonth: string
        let currentDay: number
        let latestDate: Date

        if (filtered.length > 0) {
          const latestTx = filtered.reduce((latest, tx) =>
            tx.date > latest.date ? tx : latest
          )
          latestDate = latestTx.date
          currentMonth = getSalaryMonthKey(latestDate)
          currentDay = getSalaryMonthDay(latestDate)
        } else {
          latestDate = new Date()
          currentMonth = getSalaryMonthKey(latestDate)
          currentDay = getSalaryMonthDay(latestDate)
        }

        const currentMonthTxs = filtered.filter(
          tx => isInSalaryMonth(tx.date, currentMonth) && tx.type === 'expense'
        )

        const dailyPoolSpent = currentMonthTxs
          .filter(t => t.pool === 'daily')
          .reduce((sum, t) => sum + Math.abs(t.amount), 0)

        // Monthly pool includes all non-daily expenses (monthly, mandatory, other)
        const monthlyPoolSpent = currentMonthTxs
          .filter(t => t.pool !== 'daily')
          .reduce((sum, t) => sum + Math.abs(t.amount), 0)

        const mandatorySpent = currentMonthTxs
          .filter(t => t.pool === 'mandatory')
          .reduce((sum, t) => sum + Math.abs(t.amount), 0)

        const daysInMonth = getSalaryMonthDays(currentMonth)
        const daysRemaining = daysInMonth - currentDay + 1

        const dailyPool = budget.dailyTarget * daysInMonth

        const dailyBudget = Math.max(0, (dailyPool - dailyPoolSpent) / daysRemaining)

        return {
          dailyPoolSpent,
          monthlyPoolSpent,
          mandatorySpent,
          daysRemaining,
          dailyBudget,
          currentMonth,
          currentDay,
          daysInMonth,
        }
      },

      getCurrentMonthTransactions: () => {
        const filtered = get().getFilteredTransactions()
        if (filtered.length === 0) return []

        const latestTx = filtered.reduce((latest, tx) =>
          tx.date > latest.date ? tx : latest
        )
        const currentMonth = getSalaryMonthKey(latestTx.date)

        return filtered
          .filter(tx => isInSalaryMonth(tx.date, currentMonth) && tx.type === 'expense')
          .sort((a, b) => b.date.getTime() - a.date.getTime())
      },
    }),
    {
      name: 'finance-tracker-storage',
      partialize: (state) => ({
        budget: state.budget,
      }),
    }
  )
)
