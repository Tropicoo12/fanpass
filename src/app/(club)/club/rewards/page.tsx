import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import { LOYALTY_CONFIG } from '@/types/database'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Gift, ScanQrCode } from 'lucide-react'
import Link from 'next/link'
import { RewardsManager } from './RewardsManager'
import { getAdminClubId } from '@/lib/club'
import { redirect } from 'next/navigation'

export default async function ClubRewardsPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const CLUB_ID = await getAdminClubId()
  if (!CLUB_ID) redirect('/auth/login')

  const [{ data: rewards }, { data: redemptions }] = await Promise.all([
    supabase.from('rewards').select('*').eq('club_id', CLUB_ID).order('sort_order'),
    supabase.from('redemptions').select('reward_id, status, created_at').eq('status', 'confirmed'),
  ])

  const redemptionsByReward: Record<string, number> = {}
  redemptions?.forEach(r => { redemptionsByReward[r.reward_id] = (redemptionsByReward[r.reward_id] ?? 0) + 1 })

  const active = rewards?.filter(r => r.is_active).length ?? 0
  const totalRedemptions = redemptions?.length ?? 0
  const totalPointsSpent = redemptions?.length ?? 0 // simplification

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: '#1d1d1f' }}>Récompenses</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(29,29,31,0.55)' }}>Gérez le catalogue de récompenses</p>
        </div>
        <Link
          href="/club/rewards/validate"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          style={{ background: 'rgba(225,0,26,0.08)', color: '#E1001A' }}
        >
          <ScanQrCode className="w-4 h-4" /> Valider un code
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Actives', value: active },
          { label: 'Total échanges', value: totalRedemptions },
          { label: 'Total récompenses', value: rewards?.length ?? 0 },
        ].map(s => (
          <Card key={s.label} variant="dark" className="text-center">
            <p className="text-xl font-black" style={{ color: '#1d1d1f' }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(29,29,31,0.45)' }}>{s.label}</p>
          </Card>
        ))}
      </div>

      <RewardsManager
        rewards={rewards ?? []}
        redemptionsByReward={redemptionsByReward}
        clubId={CLUB_ID}
      />
    </div>
  )
}
