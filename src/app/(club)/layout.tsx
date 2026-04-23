import Link from 'next/link'
import { LayoutDashboard, Calendar, Users, Gift, Settings } from 'lucide-react'

const navItems = [
  { href: '/club/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/club/matches', icon: Calendar, label: 'Matchs' },
  { href: '/club/fans', icon: Users, label: 'Fans' },
  { href: '/club/rewards', icon: Gift, label: 'Récompenses' },
]

export default function ClubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a14] flex">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-white/5 p-4 shrink-0">
        <div className="flex items-center gap-2 px-2 py-3 mb-8">
          <span className="text-xl">🏟️</span>
          <div>
            <p className="font-black text-sm">FanPass</p>
            <p className="text-xs text-gray-500">Club Admin</p>
          </div>
        </div>
        <nav className="space-y-1 flex-1">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-gray-400 hover:text-white group"
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/5 pt-4">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
              FC
            </div>
            <div>
              <p className="text-sm font-medium">FC Bruxelles</p>
              <p className="text-xs text-gray-500">Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar mobile */}
        <header className="lg:hidden sticky top-0 z-40 bg-[#0a0a14]/90 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏟️</span>
            <span className="font-black">FanPass Club</span>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </main>

        {/* Bottom nav mobile */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a14]/90 backdrop-blur-md border-t border-white/5 z-40">
          <div className="flex items-center justify-around py-2">
            {navItems.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-white/5 rounded-xl transition-colors"
              >
                <Icon className="w-5 h-5 text-gray-400" />
                <span className="text-[10px] text-gray-500">{label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}
