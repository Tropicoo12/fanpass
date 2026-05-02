import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import { getLoyaltyLevel, LOYALTY_CONFIG } from '@/types/database'
import { Card } from '@/components/ui/Card'
import { Users } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getAdminClubId } from '@/lib/club'
import { FansTable } from './FansTable'

export const dynamic = 'force-dynamic'

export default async function FansPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const CLUB_ID = await getAdminClubId()
  if (!CLUB_ID) redirect('/admin')

  // Primary source: ALL fans associated with this club via their profile
  const { data: profileFans } = await supabase
    .from('profiles')
    .select('id, full_name, username')
    .eq('club_id', CLUB_ID)
    .not('role', 'in', '("club_admin","super_admin")')

  const fanIds = profileFans?.map(f => f.id) ?? []

  // Get points for all these fans (may not exist for new fans)
  const { data: pointsRows } = fanIds.length > 0
    ? await supabase
        .from('fan_points')
        .select('user_id, total_points, season_points, lifetime_points')
        .eq('club_id', CLUB_ID)
        .in('user_id', fanIds)
    : { data: [] }

  const pointsMap: Record<string, { total: number; season: number; lifetime: number }> = {}
  for (const row of pointsRows ?? []) {
    pointsMap[row.user_id] = {
      total: row.total_points ?? 0,
      season: row.season_points ?? 0,
      lifetime: row.lifetime_points ?? 0,
    }
  }

  // Build fan list sorted by total points desc
  const fans = (profileFans ?? [])
    .map((f, i) => {
      const pts = pointsMap[f.id] ?? { total: 0, season: 0, lifetime: 0 }
      return {
        user_id: f.id,
        full_name: f.full_name,
        username: f.username ?? null,
        club_id: CLUB_ID,
        total_points: pts.total,
        season_points: pts.season,
        lifetime_points: pts.lifetime,
        avatar_url: null,
        loyalty_level: getLoyaltyLevel(pts.lifetime),
        rank: i + 1,
      }
    })
    .sort((a, b) => b.total_points - a.total_points)
    .map((f, i) => ({ ...f, rank: i + 1 }))

  // Checkins
  const { data: clubMatches } = await supabase.from('matches').select('id').eq('club_id', CLUB_ID)
  const matchIds = clubMatches?.map(m => m.id) ?? []

  const { data: allCheckins } = matchIds.length > 0
    ? await supabase.from('checkins').select('user_id, match_id').in('match_id', matchIds)
    : { data: [] }

  // Last activity
  const { data: lastTransactions } = await supabase
    .from('points_transactions')
    .select('user_id, created_at')
    .eq('club_id', CLUB_ID)
    .order('created_at', { ascending: false })
    .limit(1000)

  const checkinsByUser: Record<string, number> = {}
  allCheckins?.forEach(c => { checkinsByUser[c.user_id] = (checkinsByUser[c.user_id] ?? 0) + 1 })

  const lastActivityByUser: Record<string, string> = {}
  lastTransactions?.forEach(t => {
    if (!lastActivityByUser[t.user_id]) lastActivityByUser[t.user_id] = t.created_at
  })

  const total = fans.length
  const avgPoints = total > 0 ? Math.round(fans.reduce((a, f) => a + f.total_points, 0) / total) : 0
  const goldPlus = fans.filter(f => getLoyaltyLevel(f.lifetime_points) >= 2).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: '#1d1d1f' }}>Fans / CRM</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(29,29,31,0.55)' }}>{total} supporter{total !== 1 ? 's' : ''} enregistré{total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total fans', value: total },
          { label: 'Points moy.', value: avgPoints.toLocaleString('fr-BE') },
          { label: 'Gold+', value: goldPlus },
        ].map(s => (
          <Card key={s.label} variant="dark" className="text-center">
            <p className="text-xl font-black" style={{ color: '#1d1d1f' }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(29,29,31,0.45)' }}>{s.label}</p>
          </Card>
        ))}
      </div>

      {total === 0 ? (
        <Card variant="dark" className="text-center py-12">
          <Users className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(29,29,31,0.25)' }} />
          <p className="font-medium" style={{ color: 'rgba(29,29,31,0.55)' }}>Aucun fan enregistré</p>
          <p className="text-sm mt-1" style={{ color: 'rgba(29,29,31,0.40)' }}>Les fans apparaîtront ici une fois inscrits</p>
        </Card>
      ) : (
        <FansTable
          fans={fans}
          checkinsByUser={checkinsByUser}
          lastActivityByUser={lastActivityByUser}
        />
      )}
    </div>
  )
}
