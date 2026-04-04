import { auth } from '@/lib/auth'
import { UserMenu } from './UserMenu'

interface HeaderProps {
  title: string
}

export async function Header({ title }: HeaderProps) {
  const session = await auth()

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background px-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      {session?.user && <UserMenu user={session.user} />}
    </header>
  )
}
