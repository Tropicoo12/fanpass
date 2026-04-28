import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Database } from '@/types/database'
import { getLoyaltyLevel, LOYALTY_CONFIG } from '@/types/database'
import { RewardsCatalog } from './RewardsCatalog'
import { Card } from '@/components/ui/Card'
import { Star } from 'lucide-react'
import { getDefaultClubId } from '@/lib/club'

export default async function RewardsPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const CLUB_ID = (await getDefaultClubId()) ?? ''

  const [{ data: rewards }, { data: pointsData }, { data: myRedemptions }] = await Promise.all([
    supabase.from('rewards').select('*').eq('club_id', CLUB_ID).eq('is_active', true).order('sort_order'),
    supabase.from('fan_points').select('total_points').eq('user_id', user.id).eq('club_id', CLUB_ID).maybeSingle(),
    supabase.from('redemptions').select('reward_id, status').eq('user_id', user.id),
  ])

  const totalPoints = pointsData?.total_points ?? 0
  const lifetimePoints = totalPoints
  const loyaltyLevel = getLoyaltyLevel(lifetimePoints)
  const levelConfig = LOYALTY_CONFIG[loyaltyLevel]

  // Count redemptions per reward
  const redemptionCount: Record<string, number> = {}
  myRedemptions?.forEach(r => {
    if (r.status !== 'cancelled') {
      redemptionCount[r.reward_id] = (redemptionCount[r.reward_id] ?? 0) + 1
    }
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black">Récompenses</h1>
        <p className="text-gray-400 text-sm mt-1">Échange tes points contre des goodies exclusifs</p>
      </div>

      {/* Balance card */}
      <Card variant="glass">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Star className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Ton solde disponible</p>
              <p className="text-xl font-black text-emerald-400">{totalPoints.toLocaleString('fr-BE')} pts</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Niveau</p>
            <p className="text-sm font-bold" style={{ color: levelConfig.color }}>{levelConfig.name}</p>
          </div>
        </div>
      </Card>

      <RewardsCatalog
        rewards={rewards ?? []}
        userPoints={totalPoints}
        loyaltyLevel={loyaltyLevel}
        redemptionCount={redemptionCount}
        userId={user.id}
      />
    </div>
  )
}
