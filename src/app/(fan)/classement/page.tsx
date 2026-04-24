import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Database } from '@/types/database'
import { getLoyaltyLevel, LOYALTY_CONFIG } from '@/types/database'
import { Card } from '@/components/ui/Card'
import { Trophy } from 'lucide-react'
import { getDefaultClubId } from '@/lib/club'

const MEDAL = ['🥇', '🥈', '🥉']

function Avatar({ name, rank }: { name: string; rank: number }) {
  const colors = ['from-blue-500 to-purple-600', 'from-emerald-500 to-teal-600', 'from-amber-500 to-orange-600', 'from-pink-500 to-rose-600']
  const c = colors[rank % colors.length]
  return (
    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${c} flex items-center justify-center text-xs font-bold shrink-0`}>
      {name?.[0] ?? '?'}
    </div>
  )
}

export default async function LeaderboardPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const CLUB_ID = (await getDefaultClubId()) ?? ''

  const [{ data: top }, { data: myEntry }] = await Promise.all([
    supabase.from('leaderboard').select('*').eq('club_id', CLUB_ID).order('rank').limit(50),
    supabase.from('leaderboard').select('*').eq('club_id', CLUB_ID).eq('user_id', user.id).maybeSingle(),
  ])

  const myRank = myEntry?.rank ?? null
  const myPoints = myEntry?.total_points ?? 0
  const mySeasonPoints = myEntry?.season_points ?? 0
  const myLoyalty = getLoyaltyLevel(myEntry?.total_points ?? 0)

  // Find adjacent entries around current user
  const isInTop = top?.some(e => e.user_id === user.id) ?? false

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Classement</h1>
        <p className="text-gray-400 text-sm mt-1">FC Bruxelles · Saison en cours</p>
      </div>

      {/* My position */}
      {myRank && (
        <Card variant="glass" className="border border-emerald-500/20">
          <div className="flex items-center gap-4">
            <div className="text-center w-12">
              <p className="text-2xl font-black text-emerald-400">#{myRank}</p>
              <p className="text-[10px] text-gray-500">ma position</p>
            </div>
            <div className="flex-1 h-px bg-white/10" />
            <div className="text-center">
              <p className="text-lg font-black">{myPoints.toLocaleString('fr-BE')}</p>
              <p className="text-[10px] text-gray-500">pts total</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black">{mySeasonPoints.toLocaleString('fr-BE')}</p>
              <p className="text-[10px] text-gray-500">pts saison</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold" style={{ color: LOYALTY_CONFIG[myLoyalty].color }}>
                {LOYALTY_CONFIG[myLoyalty].name}
              </p>
              <p className="text-[10px] text-gray-500">niveau</p>
            </div>
          </div>
        </Card>
      )}

      {/* Podium (top 3) */}
      {top && top.length >= 3 && (
        <div className="flex items-end gap-2 justify-center pt-2">
          {/* 2nd */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <Avatar name={top[1]?.full_name ?? '?'} rank={1} />
            <p className="text-xs font-semibold text-center truncate w-full">{top[1]?.full_name?.split(' ')[0]}</p>
            <div className="w-full h-16 bg-white/10 rounded-t-xl flex items-center justify-center">
              <div className="text-center">
                <p className="text-xl">🥈</p>
                <p className="text-xs font-bold">{top[1]?.total_points?.toLocaleString('fr-BE')}</p>
              </div>
            </div>
          </div>
          {/* 1st */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <Avatar name={top[0]?.full_name ?? '?'} rank={0} />
            <p className="text-xs font-semibold text-center truncate w-full">{top[0]?.full_name?.split(' ')[0]}</p>
            <div className="w-full h-24 bg-amber-500/20 border-t-2 border-amber-400 rounded-t-xl flex items-center justify-center">
              <div className="text-center">
                <p className="text-2xl">🥇</p>
                <p className="text-xs font-bold text-amber-400">{top[0]?.total_points?.toLocaleString('fr-BE')}</p>
              </div>
            </div>
          </div>
          {/* 3rd */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <Avatar name={top[2]?.full_name ?? '?'} rank={2} />
            <p className="text-xs font-semibold text-center truncate w-full">{top[2]?.full_name?.split(' ')[0]}</p>
            <div className="w-full h-12 bg-white/5 rounded-t-xl flex items-center justify-center">
              <div className="text-center">
                <p className="text-lg">🥉</p>
                <p className="text-xs font-bold">{top[2]?.total_points?.toLocaleString('fr-BE')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full list */}
      {top && top.length > 0 ? (
        <div className="space-y-1.5">
          {top.map((entry) => {
            const isMe = entry.user_id === user.id
            const level = getLoyaltyLevel(entry.total_points ?? 0)
            const rank = entry.rank ?? 0
            return (
              <div
                key={entry.user_id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isMe ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-white/3 hover:bg-white/5'
                }`}
              >
                <span className="w-7 text-center text-sm font-bold text-gray-400">
                  {rank <= 3 ? MEDAL[rank - 1] : `#${rank}`}
                </span>
                <Avatar name={entry.full_name ?? '?'} rank={rank - 1} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isMe ? 'text-emerald-400' : ''}`}>
                    {isMe ? 'Toi' : (entry.full_name ?? entry.username ?? 'Anonyme')}
                  </p>
                  <p className="text-[10px]" style={{ color: LOYALTY_CONFIG[level].color }}>
                    {LOYALTY_CONFIG[level].name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black">{(entry.total_points ?? 0).toLocaleString('fr-BE')}</p>
                  <p className="text-[10px] text-gray-500">pts</p>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <Card variant="dark" className="text-center py-8">
          <Trophy className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Le classement sera disponible dès le premier match</p>
        </Card>
      )}
    </div>
  )
}
