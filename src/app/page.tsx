import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Database } from '@/types/database'

export default async function RootPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role === 'club_admin' || profile?.role === 'super_admin') {
      redirect('/club/dashboard')
    }
    redirect('/home')
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#16213e] px-4">
      <div className="text-center space-y-8 max-w-lg">
        <div className="flex items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-3xl">🏟️</div>
          <h1 className="text-4xl font-black tracking-tight">FanPass</h1>
        </div>

        <p className="text-gray-400 text-lg leading-relaxed">
          La plateforme de gamification pour les stades. Scanne, pronostique, accumule des points et débloque des récompenses exclusives.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/login"
            className="px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 font-semibold text-lg transition-all active:scale-95"
          >
            Espace Supporter
          </Link>
          <Link
            href="/auth/login?next=/club/dashboard"
            className="px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/20 font-semibold text-lg transition-all active:scale-95"
          >
            Dashboard Club
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4">
          {[
            { icon: '📲', label: 'Scan QR', desc: 'Check-in au match' },
            { icon: '⚽', label: 'Pronostics', desc: 'Points virtuels uniquement' },
            { icon: '🎁', label: 'Récompenses', desc: 'Bronze → Diamond' },
          ].map(item => (
            <div key={item.label} className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="font-semibold text-sm">{item.label}</div>
              <div className="text-gray-500 text-xs mt-1">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
