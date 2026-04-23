import Link from 'next/link'
import { ScanQrCode, Trophy, Gift, Home } from 'lucide-react'

const navItems = [
  { href: '/scan', icon: ScanQrCode, label: 'Scan' },
  { href: '/pronostics', icon: Trophy, label: 'Pronostics' },
  { href: '/points', icon: Home, label: 'Points' },
  { href: '/rewards', icon: Gift, label: 'Récompenses' },
]

export default function FanLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f1a] to-[#1a1a2e] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0f0f1a]/80 backdrop-blur-md border-b border-white/5 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏟️</span>
            <span className="font-black text-lg">FanPass</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500/20 text-emerald-400 rounded-full px-3 py-1 text-sm font-semibold">
              1 250 pts
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 pt-6">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0f0f1a]/90 backdrop-blur-md border-t border-white/5 z-40">
        <div className="max-w-lg mx-auto flex items-center justify-around py-2">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl hover:bg-white/5 transition-colors group"
            >
              <Icon className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
              <span className="text-[10px] text-gray-500 group-hover:text-white transition-colors">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
