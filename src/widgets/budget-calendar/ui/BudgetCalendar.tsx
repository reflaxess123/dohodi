import { FC, useMemo, useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui'
import { Button } from '@/shared/ui'
import { useTransactionStore } from '@/entities/transaction'
import type { Transaction } from '@/entities/transaction'

import {
  formatCurrency,
  cn,
  getSalaryMonthRange,
  formatSalaryMonth,
  getDayKey,
  isInSalaryMonth,
} from '@/shared/lib'

interface BudgetCalendarProps {
  month?: string
}

interface CalendarDay {
  date: Date
  dayKey: string
  displayDay: number
  salaryDay: number // 1-30ish within salary month
}

interface DayTooltipData {
  dayKey: string
  displayDay: number
  transactions: Transaction[]
  dailySpent: number
  monthlySpent: number
  otherSpent: number
  totalSpent: number
  buttonRef: HTMLButtonElement
  isFuture: boolean
  dailyPoolRemaining?: number
  monthlyPoolRemaining?: number
  effectiveDailyBudget?: number
}

// Categories that should show subcategories (by description)
const EXPANDABLE_CATEGORIES = ['Различные товары']

export const BudgetCalendar: FC<BudgetCalendarProps> = ({ month }) => {
  const [selectedDay, setSelectedDay] = useState<DayTooltipData | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const [monthOffset, setMonthOffset] = useState(0)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const cardRef = useRef<HTMLDivElement>(null)
  const { budget, getDailyData, getCurrentMonthStats, getFilteredTransactions, getMonthlyData } = useTransactionStore()

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectedDay && cardRef.current && !cardRef.current.contains(e.target as Node)) {
        closePopup()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selectedDay])

  const closePopup = () => {
    setIsClosing(true)
    setTimeout(() => {
      setSelectedDay(null)
      setIsClosing(false)
    }, 150)
  }
  const stats = getCurrentMonthStats()

  // Get available months for pagination (sorted newest first)
  const monthlyData = getMonthlyData()
  const availableMonths = monthlyData.map(m => m.month)

  // Calculate displayed month based on offset
  const baseMonth = month || stats.currentMonth
  const baseMonthIndex = availableMonths.indexOf(baseMonth)
  // If base month not in list, use first available (most recent)
  const currentMonthIndex = baseMonthIndex >= 0 ? baseMonthIndex : 0
  const displayedMonthIndex = currentMonthIndex + monthOffset
  const currentMonth = availableMonths[displayedMonthIndex] || availableMonths[0] || baseMonth

  // Navigation limits: can go back (older = higher index), can go forward (newer = lower index)
  const canGoBack = displayedMonthIndex < availableMonths.length - 1
  const canGoForward = displayedMonthIndex > 0

  // Get month statistics for displayed month
  const displayedMonthData = monthlyData.find(m => m.month === currentMonth)
  const monthIncome = displayedMonthData?.totalIncome || 0
  const monthExpenses = displayedMonthData?.totalExpenses || 0
  const monthBalance = monthIncome - monthExpenses

  const { start, end } = getSalaryMonthRange(currentMonth)

  // Build array of all days in salary month (23rd to 22nd)
  const calendarDays = useMemo(() => {
    const days: CalendarDay[] = []
    const current = new Date(start)
    let salaryDay = 1

    while (current <= end) {
      days.push({
        date: new Date(current),
        dayKey: getDayKey(current),
        displayDay: current.getDate(),
        salaryDay: salaryDay++,
      })
      current.setDate(current.getDate() + 1)
    }
    return days
  }, [start, end])

  const dailyData = getDailyData(currentMonth)
  const dailyMap = new Map(dailyData.map(d => [d.date, d]))

  // Get all transactions for this salary month
  const allTransactions = getFilteredTransactions().filter(
    t => isInSalaryMonth(t.date, currentMonth)
  )

  const isViewingCurrentMonth = currentMonth === stats.currentMonth
  const todaySalaryDay = stats.currentDay
  const daysInMonth = stats.daysInMonth
  // Past month = viewing month that is older than the current actual month
  const isPastMonth = displayedMonthIndex > currentMonthIndex

  const dailyTarget = budget.dailyTarget

  // Find max spending to scale circle sizes
  const maxSpent = Math.max(
    dailyTarget * 2,
    ...dailyData.map(d => d.dailyPoolSpent)
  )

  // Calculate remaining budget for future days (only for current month)
  const dailyPool = dailyTarget * daysInMonth
  const totalSpentSoFar = dailyData.reduce((sum, d) => sum + d.dailyPoolSpent, 0)
  const remainingBudget = dailyPool - totalSpentSoFar
  const daysRemaining = stats.daysRemaining
  const projectedDaily = remainingBudget / Math.max(1, daysRemaining)

  const getDayStyle = (salaryDay: number, spent: number) => {
    // Past months - all days are past; current month - check salaryDay
    const isFuture = !isPastMonth && (!isViewingCurrentMonth || salaryDay > todaySalaryDay)
    const amount = isFuture ? projectedDaily : spent

    // Size based on spending (min 24px, max 44px)
    const sizeRatio = Math.min(1, amount / maxSpent)
    const size = 24 + sizeRatio * 20

    // Color based on budget status
    let bgColor: string
    let textColor: string

    if (isFuture) {
      // Future days - gray
      bgColor = 'bg-gray-200 dark:bg-gray-700'
      textColor = 'text-gray-500 dark:text-gray-400'
    } else if (spent === 0) {
      // No spending
      bgColor = 'bg-gray-100 dark:bg-gray-800'
      textColor = 'text-muted-foreground'
    } else {
      // Past days - color based on spending vs target
      const diff = dailyTarget - spent
      if (diff >= 0) {
        // Under budget - green
        bgColor = 'bg-green-500 dark:bg-green-600'
        textColor = 'text-white'
      } else if (diff >= -500) {
        // Slightly over - yellow
        bgColor = 'bg-yellow-500 dark:bg-yellow-600'
        textColor = 'text-white'
      } else {
        // Way over - red
        bgColor = 'bg-red-500 dark:bg-red-600'
        textColor = 'text-white'
      }
    }

    return { size, bgColor, textColor, amount, isFuture }
  }

  // Pool budgets from store (synced with BudgetCalculator sliders)
  const foodPoolBudget = budget.foodPoolBudget
  const monthlyPoolBudget = budget.monthlyPoolBudget

  // Use stats from getCurrentMonthStats to match BudgetCalculator exactly
  const foodPoolSpent = stats.dailyPoolSpent
  const monthlyPoolSpent = stats.monthlyPoolSpent

  // Remaining in each pool
  const foodPoolRemaining = foodPoolBudget - foodPoolSpent
  const monthlyPoolRemaining = monthlyPoolBudget - monthlyPoolSpent

  // Daily budget from food pool for remaining days (use stats.daysRemaining for consistency)
  const effectiveDailyFromPool = foodPoolRemaining / Math.max(1, stats.daysRemaining)

  const getDayTransactions = (dayKey: string, displayDay: number, buttonEl: HTMLButtonElement, isFuture: boolean): DayTooltipData => {
    const dayTransactions = allTransactions.filter(t => getDayKey(t.date) === dayKey)
    const expenses = dayTransactions.filter(t => t.type === 'expense')

    const dailySpent = expenses.filter(t => t.pool === 'daily').reduce((sum, t) => sum + Math.abs(t.amount), 0)
    // Monthly includes all non-daily pools (monthly, mandatory, other)
    const monthlySpent = expenses.filter(t => t.pool !== 'daily').reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const otherSpent = 0 // No longer used, kept for interface compatibility

    return {
      dayKey,
      displayDay,
      transactions: dayTransactions,
      dailySpent,
      monthlySpent,
      otherSpent,
      totalSpent: expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0),
      buttonRef: buttonEl,
      isFuture,
      dailyPoolRemaining: foodPoolRemaining,
      monthlyPoolRemaining: monthlyPoolRemaining,
      effectiveDailyBudget: effectiveDailyFromPool,
    }
  }

  const handleDayClick = (e: React.MouseEvent<HTMLButtonElement>, dayKey: string, displayDay: number, isFuture: boolean) => {
    const data = getDayTransactions(dayKey, displayDay, e.currentTarget, isFuture)

    if (selectedDay?.dayKey === dayKey) {
      closePopup()
    } else {
      setSelectedDay(data)
    }
  }

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  // Get the day of week for the first day (23rd)
  const startDayOfWeek = (start.getDay() + 6) % 7 // Monday = 0

  return (
    <Card className="w-full relative" ref={cardRef}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">
            Календарь расходов
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                closePopup()
                setMonthOffset(prev => prev + 1)
              }}
              disabled={!canGoBack}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                closePopup()
                setMonthOffset(prev => prev - 1)
              }}
              disabled={!canGoForward}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {formatSalaryMonth(currentMonth)} • Цель: {formatCurrency(dailyTarget)}/день
        </div>
        {/* Month balance summary */}
        <div className="flex items-center gap-4 mt-2 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Доход:</span>
            <span className="text-green-600 dark:text-green-400 font-medium">{formatCurrency(monthIncome)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Расход:</span>
            <span className="text-red-600 dark:text-red-400 font-medium">{formatCurrency(monthExpenses)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Итого:</span>
            <span className={cn(
              'font-bold',
              monthBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            )}>
              {monthBalance >= 0 ? '+' : ''}{formatCurrency(monthBalance)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Week days header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs text-muted-foreground py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid with circles */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before salary month start */}
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-12 flex items-center justify-center" />
          ))}

          {/* Days of salary month */}
          {calendarDays.map((day) => {
            const dayData = dailyMap.get(day.dayKey)
            const spent = dayData?.dailyPoolSpent || 0
            const style = getDayStyle(day.salaryDay, spent)
            const isToday = isViewingCurrentMonth && day.salaryDay === todaySalaryDay
            // Future: only in current month and salaryDay > today
            const isFuture = !isPastMonth && isViewingCurrentMonth && day.salaryDay > todaySalaryDay
            const isSelected = selectedDay?.dayKey === day.dayKey

            return (
              <div key={day.dayKey} className="h-12 flex items-center justify-center relative">
                <button
                  onClick={(e) => handleDayClick(e, day.dayKey, day.displayDay, isFuture)}
                  className={cn(
                    'rounded-full flex flex-col items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95',
                    style.bgColor,
                    style.textColor,
                    isToday && 'ring-2 ring-offset-2 ring-primary',
                    isSelected && 'ring-2 ring-offset-2 ring-blue-500'
                  )}
                  style={{ width: style.size, height: style.size }}
                >
                  <span className="text-[10px] font-medium leading-none">
                    {day.displayDay}
                  </span>
                  {!style.isFuture && spent > 0 && (
                    <span className="text-[8px] leading-none opacity-90">
                      {spent >= 1000 ? `${(spent / 1000).toFixed(1)}k` : Math.round(spent)}
                    </span>
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {/* Floating popup above the clicked circle */}
        {selectedDay && (selectedDay.transactions.length > 0 || selectedDay.isFuture) && (() => {
          const buttonRect = selectedDay.buttonRef.getBoundingClientRect()
          const cardRect = cardRef.current?.getBoundingClientRect()
          if (!cardRect) return null

          // Position relative to card
          const left = buttonRect.left - cardRect.left + buttonRect.width / 2
          const top = buttonRect.top - cardRect.top

          return (
            <div
              className={cn(
                'absolute z-50 w-64',
                isClosing ? 'animate-out fade-out zoom-out-95 duration-150' : 'animate-in fade-in zoom-in-95 duration-200'
              )}
              style={{
                left: `${left}px`,
                top: `${top - 8}px`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <div className="p-4 bg-white dark:bg-zinc-900 border border-border rounded-xl shadow-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-lg">{selectedDay.displayDay} число</div>
                  <button
                    onClick={closePopup}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1 -m-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {selectedDay.isFuture ? (
                  // Future day - show remaining pools
                  <>
                    <div className="text-sm text-muted-foreground text-center">
                      Остаток в пулах
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-green-100 dark:bg-green-900 rounded-lg p-3 text-center">
                        <div className={cn(
                          "font-bold text-lg",
                          (selectedDay.dailyPoolRemaining || 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        )}>
                          {formatCurrency(selectedDay.dailyPoolRemaining || 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">Пул на еду</div>
                      </div>
                      <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-3 text-center">
                        <div className={cn(
                          "font-bold text-lg",
                          (selectedDay.monthlyPoolRemaining || 0) >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"
                        )}>
                          {formatCurrency(selectedDay.monthlyPoolRemaining || 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">Ежемесячный пул</div>
                      </div>
                    </div>
                    <div className="bg-purple-100 dark:bg-purple-900 rounded-lg p-3 text-center">
                      <div className="text-purple-600 dark:text-purple-400 font-bold text-xl">
                        {formatCurrency(selectedDay.effectiveDailyBudget || 0)}
                      </div>
                      <div className="text-xs text-muted-foreground">Можно тратить в день на еду</div>
                    </div>
                  </>
                ) : (
                  // Past day - show spent amounts
                  <>
                    {/* Pool breakdown - compact */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-2 text-center">
                        <div className="text-blue-600 dark:text-blue-400 font-bold text-base">{formatCurrency(selectedDay.dailySpent)}</div>
                        <div className="text-xs text-muted-foreground">Еда</div>
                      </div>
                      <div className="bg-purple-100 dark:bg-purple-900 rounded-lg p-2 text-center">
                        <div className="text-purple-600 dark:text-purple-400 font-bold text-base">{formatCurrency(selectedDay.monthlySpent)}</div>
                        <div className="text-xs text-muted-foreground">Месяц</div>
                      </div>
                      <div className="bg-red-100 dark:bg-red-900 rounded-lg p-2 text-center">
                        <div className="text-red-600 dark:text-red-400 font-bold text-base">{formatCurrency(selectedDay.totalSpent)}</div>
                        <div className="text-xs text-muted-foreground">Всего</div>
                      </div>
                    </div>

                    {/* Transactions list */}
                    <div className="border-t pt-3 space-y-2">
                      {selectedDay.transactions
                        .filter(t => t.type === 'expense')
                        .map((t, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="truncate mr-3 text-foreground">{t.description || t.category}</span>
                            <span className="text-red-600 dark:text-red-400 flex-shrink-0 font-semibold">{formatCurrency(Math.abs(t.amount))}</span>
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </div>

              {/* Triangle pointer at bottom */}
              <div
                className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white dark:border-t-zinc-900"
              />
            </div>
          )
        })()}

        {/* Legend */}
        <div className="flex justify-center gap-3 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>В норме</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>Чуть больше</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Перерасход</span>
          </div>
        </div>
        <div className="text-center text-xs text-muted-foreground mt-1">
          Размер = сумма расхода
        </div>

        {/* Daily (food) expenses breakdown */}
        {(() => {
          const dailyExpenses = allTransactions
            .filter(t => t.type === 'expense' && t.pool === 'daily')

          if (dailyExpenses.length === 0) return null

          // Group by category
          const categoryMap = new Map<string, { total: number; subcategories: Map<string, number> }>()
          dailyExpenses.forEach(t => {
            const current = categoryMap.get(t.category) || { total: 0, subcategories: new Map() }
            current.total += Math.abs(t.amount)

            // For expandable categories, track by description
            if (EXPANDABLE_CATEGORIES.includes(t.category)) {
              const desc = t.description || 'Другое'
              const subCurrent = current.subcategories.get(desc) || 0
              current.subcategories.set(desc, subCurrent + Math.abs(t.amount))
            }

            categoryMap.set(t.category, current)
          })

          const sortedCategories = Array.from(categoryMap.entries())
            .sort((a, b) => b[1].total - a[1].total)

          const totalDaily = sortedCategories.reduce((sum, [, data]) => sum + data.total, 0)

          const toggleCategory = (category: string) => {
            setExpandedCategories(prev => {
              const next = new Set(prev)
              if (next.has(category)) {
                next.delete(category)
              } else {
                next.add(category)
              }
              return next
            })
          }

          return (
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium">На еду потрачено</span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(totalDaily)}
                </span>
              </div>
              <div className="space-y-2">
                {sortedCategories.map(([category, data]) => {
                  const isExpandable = EXPANDABLE_CATEGORIES.includes(category) && data.subcategories.size > 0
                  const isExpanded = expandedCategories.has(category)
                  const sortedSubs = Array.from(data.subcategories.entries()).sort((a, b) => b[1] - a[1])

                  return (
                    <div key={category}>
                      <div
                        className={cn(
                          "flex justify-between text-sm",
                          isExpandable && "cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded"
                        )}
                        onClick={() => isExpandable && toggleCategory(category)}
                      >
                        <span className="text-muted-foreground truncate mr-2 flex items-center gap-1">
                          {isExpandable && (
                            <ChevronDown className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-180")} />
                          )}
                          {category}
                        </span>
                        <span className="flex-shrink-0 font-medium">{formatCurrency(data.total)}</span>
                      </div>
                      {isExpandable && isExpanded && (
                        <div className="ml-4 mt-1 space-y-1 border-l-2 border-muted pl-2">
                          {sortedSubs.map(([desc, amount]) => (
                            <div key={desc} className="flex justify-between text-xs">
                              <span className="text-muted-foreground truncate mr-2">{desc}</span>
                              <span className="flex-shrink-0">{formatCurrency(amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* Monthly expenses breakdown - includes monthly, mandatory, other pools */}
        {(() => {
          const monthlyExpenses = allTransactions
            .filter(t => t.type === 'expense' && t.pool !== 'daily')

          if (monthlyExpenses.length === 0) return null

          // Group by category
          const categoryMap = new Map<string, number>()
          monthlyExpenses.forEach(t => {
            const current = categoryMap.get(t.category) || 0
            categoryMap.set(t.category, current + Math.abs(t.amount))
          })

          const sortedCategories = Array.from(categoryMap.entries())
            .sort((a, b) => b[1] - a[1])

          const totalMonthly = sortedCategories.reduce((sum, [, amount]) => sum + amount, 0)

          return (
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium">Ежемесячные расходы</span>
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(totalMonthly)}
                </span>
              </div>
              <div className="space-y-2">
                {sortedCategories.map(([category, amount]) => (
                  <div key={category} className="flex justify-between text-sm">
                    <span className="text-muted-foreground truncate mr-2">{category}</span>
                    <span className="flex-shrink-0 font-medium">{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}
      </CardContent>
    </Card>
  )
}
