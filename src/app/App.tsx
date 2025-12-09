import { FC } from 'react'
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { ThemeProvider } from './providers'
import { Header } from '@/widgets/header'
import { BottomNav } from '@/widgets/navigation'
import { DashboardPage } from '@/pages/dashboard'
import { MonthlyPage } from '@/pages/monthly'
import { DailyPage } from '@/pages/daily'
import { StatsPage } from '@/pages/stats'
import { TransactionsPage } from '@/pages/transactions'

const Layout: FC = () => (
  <div className="min-h-screen bg-background">
    <Header />
    <main className="container px-4 py-4 mx-auto max-w-lg">
      <Outlet />
    </main>
    <BottomNav />
  </div>
)

export const App: FC = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/month/:id" element={<MonthlyPage />} />
            <Route path="/day/:id" element={<DailyPage />} />
            <Route path="/stats" element={<StatsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
