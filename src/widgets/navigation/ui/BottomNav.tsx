import { FC } from 'react'
import { NavLink } from 'react-router-dom'
import { Home, BarChart3, List } from 'lucide-react'
import { cn } from '@/shared/lib'

const navItems = [
  { to: '/', icon: Home, label: 'Главная' },
  { to: '/transactions', icon: List, label: 'Операции' },
  { to: '/stats', icon: BarChart3, label: 'Статистика' },
]

export const BottomNav: FC = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-safe">
      <div className="container flex h-16 items-center justify-around px-4">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors touch-target',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
