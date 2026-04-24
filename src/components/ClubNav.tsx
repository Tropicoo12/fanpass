'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Calendar, Users, Gift,
  Megaphone, BarChart3, Building2,
} from 'lucide-react'

const navItems = [
  { href: '/club/dashboard',     icon: LayoutDashboard, label: 'Dashboard'   },
  { href: '/club/matches',       icon: Calendar,        label: 'Matchs'      },
  { href: '/club/rewards',       icon: Gift,            label: 'Récompenses' },
  { href: '/club/sponsors',      icon: Building2,       label: 'Sponsors'    },
  { href: '/club/fans',          icon: Users,           label: 'Fans'        },
  { href: '/club/notifications', icon: Megaphone,       label: 'Notifs'      },
  { href: '/club/analytics',     icon: BarChart3,       label: 'Analytics'   },
]

export function ClubSidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
      {navItems.map(({ href, icon: Icon, label }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
              active
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export function ClubMobileNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a14]/95 backdrop-blur-md border-t border-white/5 z-40">
      <div className="flex items-center overflow-x-auto scrollbar-none">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors min-w-[60px] ${
                active ? 'text-emerald-400' : 'text-gray-500'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[9px] whitespace-nowrap">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
