'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ScanQrCode, Trophy, Gift, BarChart3 } from 'lucide-react'

const navItems = [
  { href: '/home',       icon: Home,       label: 'Accueil'     },
  { href: '/scan',       icon: ScanQrCode, label: 'Scan'        },
  { href: '/pronostics', icon: Trophy,     label: 'Pronos'      },
  { href: '/rewards',    icon: Gift,       label: 'Récompenses' },
  { href: '/classement', icon: BarChart3,  label: 'Classement'  },
]

export function FanNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0f0f1a]/95 backdrop-blur-md border-t border-white/5 z-40">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors"
            >
              <Icon className={`w-5 h-5 transition-colors ${active ? 'text-emerald-400' : 'text-gray-500'}`} />
              <span className={`text-[10px] transition-colors ${active ? 'text-emerald-400 font-semibold' : 'text-gray-500'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
