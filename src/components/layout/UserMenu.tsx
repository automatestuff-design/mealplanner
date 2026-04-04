'use client'

import { signOut } from 'next-auth/react'
import { LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UserMenuProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function UserMenu({ user }: UserMenuProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
          {user.name ? user.name[0].toUpperCase() : <User className="h-4 w-4" />}
        </div>
        <span className="text-sm text-muted-foreground hidden sm:block">
          {user.name ?? user.email}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => signOut({ callbackUrl: '/login' })}
        title="Sign out"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  )
}
