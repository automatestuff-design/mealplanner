'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, ChefHat, ShoppingCart, Target, UtensilsCrossed } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const navItems = [
  { href: '/planner', label: 'Meal Planner', icon: CalendarDays },
  { href: '/recipes', label: 'Recipes', icon: ChefHat },
  { href: '/grocery-list', label: 'Grocery List', icon: ShoppingCart },
  { href: '/goals', label: 'Macro Goals', icon: Target },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/planner" className="flex items-center gap-2 font-semibold text-lg">
          <UtensilsCrossed className="h-6 w-6 text-primary" />
          <span>MealPlanner</span>
        </Link>
      </div>
      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
