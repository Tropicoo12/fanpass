import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Database } from '@/types/database'
import { getLoyaltyLevel, LOYALTY_CONFIG } from '@/types/database'
import { FanNav } from '@/components/FanNav'
import { getDefaultClubId } from '@/lib/club'

export default async function FanLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const CLUB_ID = (await getDefaultClubId()) ?? ''

  const [{ data: pointsData }, { data: profile }] = await Promise.all([
    supabase.from('fan_points').select('total_points, lifetime_points').eq('user_id', user.id).eq('club_id', CLUB_ID).maybeSingle(),
    supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single(),
  ])

  const totalPoints = pointsData?.total_points ?? 0
  const lifetimePoints = pointsData?.lifetime_points ?? 0
  const loyaltyLevel = getLoyaltyLevel(lifetimePoints)
  const levelConfig = LOYALTY_CONFIG[loyaltyLevel]

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f1a] to-[#1a1a2e] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0f0f1a]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏟️</span>
            <span className="font-black text-lg">FanPass</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full border"
              style={{ color: levelConfig.color, borderColor: levelConfig.color + '40', background: levelConfig.color + '15' }}
            >
              {levelConfig.name}
            </span>
            <div className="bg-emerald-500/20 text-emerald-400 rounded-full px-3 py-1 text-sm font-bold">
              {totalPoints.toLocaleString('fr-BE')} pts
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 pt-6">
        {children}
      </main>

      <FanNav />
    </div>
  )
}
