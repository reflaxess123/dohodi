export interface RawTransaction {
  operationDate: string
  paymentDate: string
  cardNumber: string
  status: string
  operationAmount: number
  operationCurrency: string
  paymentAmount: number
  paymentCurrency: string
  cashback: string
  category: string
  mcc: string
  description: string
  bonuses: string
  investRounding: string
  amountWithRounding: string
}

export interface Transaction {
  id: string
  date: Date
  amount: number
  category: string
  description: string
  cardNumber: string
  mcc: string
  type: 'expense' | 'income'
  isFiltered: boolean
  filterReason?: string
  pool: 'daily' | 'monthly' | 'mandatory' | 'other'
}

export interface MonthlyData {
  month: string
  totalExpenses: number
  totalIncome: number
  dailyPoolSpent: number
  monthlyPoolSpent: number
  mandatorySpent: number
  categories: CategoryData[]
}

export interface DailyData {
  date: string
  expenses: number
  income: number
  dailyPoolSpent: number
  categories: CategoryData[]
}

export interface CategoryData {
  name: string
  amount: number
  percentage: number
  count: number
}

export type PoolType = 'daily' | 'monthly' | 'mandatory' | 'other'

export interface BudgetState {
  income: number
  mandatory: {
    batman: number
    claudeCode: number
    debtPayment: number
  }
  dailyTarget: number
  totalDebt: number
  paidDebt: number
  // Pool budgets (adjustable via sliders)
  foodPoolBudget: number
  monthlyPoolBudget: number
}
