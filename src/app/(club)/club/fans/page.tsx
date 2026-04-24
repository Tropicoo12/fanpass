import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import { getLoyaltyLevel, LOYALTY_CONFIG } from '@/types/database'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Download, Search } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getAdminClubId } from '@/lib/club'

export default async function FansPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const CLUB_ID = await getAdminClubId()
  if (!CLUB_ID) redirect('/auth/login')

  const [{ data: fans }, { data: checkinData }] = await Promise.all([
    supabase.from('leaderboard').select('*').eq('club_id', CLUB_ID).order('rank').limit(100),
    supabase.from('checkins').select('user_id').eq('match_id',
      // dummy — just get all checkins per user
      supabase.from('matches').select('id').eq('club_id', CLUB_ID).limit(1) as any
    ),
  ])

  // Get checkin counts per user
  const { data: allCheckins } = await supabase
    .from('checkins')
    .select('user_id, match_id, matches!inner(club_id)')
    .eq('matches.club_id', CLUB_ID)

  const checkinsByUser: Record<string, number> = {}
  allCheckins?.forEach(c => { checkinsByUser[c.user_id] = (checkinsByUser[c.user_id] ?? 0) + 1 })

  const total = fans?.length ?? 0
  const avgPoints = total > 0 ? Math.round((fans?.reduce((a, f) => a + (f.total_points ?? 0), 0) ?? 0) / total) : 0
  const goldPlus = fans?.filter(f => getLoyaltyLevel(f.total_points ?? 0) >= 2).length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Fans / CRM</h1>
          <p className="text-gray-400 text-sm mt-1">{total} supporter{total > 1 ? 's' : ''} enregistré{total > 1 ? 's' : ''}</p>
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

      {/* Fan table */}
      <Card variant="dark">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-white/5">
                <th className="pb-3 text-gray-400 font-medium">#</th>
                <th className="pb-3 text-gray-400 font-medium">Fan</th>
                <th className="pb-3 text-gray-400 font-medium hidden sm:table-cell">Niveau</th>
                <th className="pb-3 text-gray-400 font-medium">Check-ins</th>
                <th className="pb-3 text-gray-400 font-medium">Points</th>
                <th className="pb-3 text-gray-400 font-medium hidden md:table-cell">Saison</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {fans?.map((fan, i) => {
                const level = getLoyaltyLevel(fan.total_points ?? 0)
                const levelCfg = LOYALTY_CONFIG[level]
                const checks = checkinsByUser[fan.user_id] ?? 0
                const churnRisk = fan.total_points !== null && fan.total_points < 200 && checks === 0

                return (
                  <tr key={fan.user_id} className="hover:bg-white/2 transition-colors">
                    <td className="py-3 text-gray-600 text-xs">{i + 1}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold shrink-0">
                          {fan.full_name?.[0] ?? '?'}
                        </div>
                        <div>
                          <p className="font-medium truncate max-w-[120px]">{fan.full_name ?? fan.username ?? 'Anonyme'}</p>
                          {churnRisk && <p className="text-[10px] text-red-400">Risque churn</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 hidden sm:table-cell">
                      <span className="text-xs font-medium" style={{ color: levelCfg.color }}>{levelCfg.name}</span>
                    </td>
                    <td className="py-3">
                      <Badge variant="info">{checks}</Badge>
                    </td>
                    <td className="py-3 font-bold text-emerald-400">{(fan.total_points ?? 0).toLocaleString('fr-BE')}</td>
                    <td className="py-3 text-gray-400 hidden md:table-cell">{(fan.season_points ?? 0).toLocaleString('fr-BE')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {(!fans || fans.length === 0) && (
            <p className="text-gray-500 text-sm text-center py-8">Aucun fan enregistré</p>
          )}
        </div>
      </Card>
    </div>
  )
}
