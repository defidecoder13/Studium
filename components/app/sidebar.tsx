'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  BookOpen,
  BookmarkIcon,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  CheckCircle2,
  CalendarClock,
} from 'lucide-react'
import { StudiumLogo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { useClerk } from '@clerk/nextjs'

const navItems = [
  {
    label: 'Dashboard',
    href: '/app/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'My Library',
    href: '/app/library',
    icon: BookOpen,
  },
  {
    label: 'Bookmarks',
    href: '/app/bookmarks',
    icon: BookmarkIcon,
  },
  {
    label: 'Flashcards',
    href: '/app/flashcards',
    icon: CheckCircle2,
  },
  {
    label: 'Quizzes',
    href: '/app/quizzes',
    icon: HelpCircle,
  },
  {
    label: 'Study Planner',
    href: '/app/study-planner',
    icon: CalendarClock,
  },
  {
    label: 'Settings',
    href: '/app/settings',
    icon: Settings,
  },
]

export function Sidebar({ user }: { user?: { name?: string | null; email?: string | null } }) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Auto-collapse on small screens (debounced — was: setState per pixel)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const handleResize = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        setIsCollapsed(window.innerWidth < 1024)
      }, 150)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const router = useRouter()
  const { signOut } = useClerk()
  const handleLogout = async () => {
    await signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <aside
      className={cn(
        'relative flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out z-30 select-none shrink-0',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3.5 top-6 w-7 h-7 rounded-full border border-border bg-background shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-40 hover:scale-105"
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Header / Brand */}
      <div className={cn('h-16 border-b border-border flex items-center px-4 transition-all', isCollapsed ? 'justify-center' : 'justify-start gap-3 px-6')}>
        <Link href="/app/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-black dark:bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105">
            <StudiumLogo size={20} className="text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 animate-in fade-in duration-200">
              <span className="text-base font-heading font-bold text-foreground tracking-tight leading-none">Studium</span>
              <span className="text-[10px] font-mono text-muted-foreground pt-1">Precision Learning</span>
            </div>
          )}
        </Link>
      </div>

      {/* Main Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-1.5">
        {!isCollapsed && (
          <div className="px-3 pb-2 text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground/70 animate-in fade-in duration-200">
            Workspace
          </div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href) || (item.href === '/app/library' && (pathname.startsWith('/app/documents') || pathname.startsWith('/app/reader')))

          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative',
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground'
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-primary" />
              )}
              <Icon
                className={cn(
                  'w-5 h-5 shrink-0 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                )}
              />
              {!isCollapsed && (
                <span className="truncate animate-in fade-in duration-200">{item.label}</span>
              )}

              {/* Active right dot if collapsed */}
              {isCollapsed && isActive && (
                <span className="absolute right-2 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer Section: User Profile & Logout */}
      <div className="p-3 border-t border-border space-y-2 bg-muted/20">
        {/* User Profile Card */}
        <div
          className={cn(
            'flex items-center gap-3 p-2 rounded-xl border border-border/80 bg-background/80 transition-all',
            isCollapsed ? 'justify-center p-2' : 'px-3 py-2.5'
          )}
          title={isCollapsed ? `${user?.name || 'Alex Rodriguez'} (${user?.email || 'alex@studium.ai'})` : undefined}
        >
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0 relative">
            {user?.name?.charAt(0).toUpperCase() || 'A'}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 flex-1 animate-in fade-in duration-200">
              <span className="text-xs font-semibold text-foreground truncate">{user?.name || 'Alex Rodriguez'}</span>
              <span className="text-[10px] text-muted-foreground truncate">{user?.email || 'alex@studium.ai'}</span>
            </div>
          )}
        </div>

        {/* Logout Action */}
        <Button
          onClick={handleLogout}
          variant="ghost"
          size="sm"
          title={isCollapsed ? 'Logout' : undefined}
          className={cn(
            'w-full justify-start gap-3 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors font-medium h-9',
            isCollapsed ? 'justify-center px-0' : 'px-3.5'
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span className="animate-in fade-in duration-200 text-xs">Logout</span>}
        </Button>
      </div>
    </aside>
  )
}
