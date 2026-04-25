import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import { getLoyaltyLevel, LOYALTY_CONFIG } from '@/types/database'
import { Card } from '@/components/ui/Card'
import { Download, Users } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getAdminClubId } from '@/lib/club'
import { FansTable } from './FansTable'

export default async function FansPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const CLUB_ID = await getAdminClubId()
  if (!CLUB_ID) redirect('/auth/login')

  const { data: fans } = await supabase
    .from('leaderboard')
    .select('*')
    .eq('club_id', CLUB_ID)
    .order('rank')
    .limit(500)

  // Two-step checkins query
  const { data: clubMatches } = await supabase.from('matches').select('id').eq('club_id', CLUB_ID)
  const matchIds = clubMatches?.map(m => m.id) ?? []

  const { data: allCheckins } = matchIds.length > 0
    ? await supabase.from('checkins').select('user_id, match_id').in('match_id', matchIds)
    : { data: [] }

  // Last transaction per user (as proxy for last activity)
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

  const total = fans?.length ?? 0
  const avgPoints = total > 0 ? Math.round((fans?.reduce((a, f) => a + (f.total_points ?? 0), 0) ?? 0) / total) : 0
  const goldPlus = fans?.filter(f => getLoyaltyLevel(f.total_points ?? 0) >= 2).length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Fans / CRM</h1>
          <p className="text-gray-400 text-sm mt-1">{total} supporter{total !== 1 ? 's' : ''} enregistré{total !== 1 ? 's' : ''}</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 font-semibold text-sm transition-all">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total fans', value: total },
          { label: 'Points moy.', value: avgPoints.toLocaleString('fr-BE') },
          { label: 'Gold+', value: goldPlus },
        ].map(s => (
          <Card key={s.label} variant="dark" className="text-center">
            <p className="text-xl font-black">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {total === 0 ? (
        <Card variant="dark" className="text-center py-12">
          <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Aucun fan enregistré</p>
          <p className="text-gray-500 text-sm mt-1">Les fans apparaîtront ici une fois inscrits</p>
        </Card>
      ) : (
        <FansTable
          fans={fans ?? []}
          checkinsByUser={checkinsByUser}
          lastActivityByUser={lastActivityByUser}
        />
      )}
    </div>
  )
}
