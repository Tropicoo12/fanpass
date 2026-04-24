import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import { LOYALTY_CONFIG, getLoyaltyLevel } from '@/types/database'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Users, QrCode, TrendingUp, Gift, ArrowUp, ArrowDown, Calendar, Zap } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAdminClubId } from '@/lib/club'

function KpiCard({ label, value, sub, icon: Icon, trend }: {
  label: string; value: string; sub?: string; icon: any; trend?: { dir: 'up' | 'down'; label: string }
}) {
  return (
    <Card variant="dark">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
          <Icon className="w-4 h-4 text-gray-400" />
        </div>
        {trend && (
          <span className={`text-xs font-medium flex items-center gap-0.5 ${trend.dir === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend.dir === 'up' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {trend.label}
          </span>
        )}
      </div>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-gray-500 text-xs mt-1">{label}</p>
      {sub && <p className="text-gray-600 text-xs">{sub}</p>}
    </Card>
  )
}

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const CLUB_ID = await getAdminClubId()
  if (!CLUB_ID) redirect('/auth/login')

  const [
    { count: totalFans },
    { count: totalCheckins },
    { count: totalRedemptions },
    { data: pointsAgg },
    { data: nextMatch },
    { data: topFans },
    { data: recentTransactions },
    { data: activeActivations },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'fan'),
    supabase.from('checkins').select('*', { count: 'exact', head: true }),
    supabase.from('redemptions').select('*', { count: 'exact', head: true }).neq('status', 'cancelled'),
    supabase.from('fan_points').select('total_points').eq('club_id', CLUB_ID),
    supabase.from('matches').select('*').eq('club_id', CLUB_ID).in('status', ['upcoming', 'live']).order('match_date').limit(1).maybeSingle(),
    supabase.from('leaderboard').select('*').eq('club_id', CLUB_ID).order('rank').limit(5),
    supabase.from('points_transactions').select('amount, type, description, created_at, profiles(full_name)').eq('club_id', CLUB_ID).order('created_at', { ascending: false }).limit(10),
    supabase.from('activations').select('*').eq('club_id', CLUB_ID).eq('status', 'active'),
  ])

  const totalPoints = pointsAgg?.reduce((acc, r) => acc + (r.total_points ?? 0), 0) ?? 0

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">FC Bruxelles · Vue d'ensemble</p>
        </div>
        {nextMatch?.status === 'live' && (
          <Link href={`/club/live/${nextMatch.id}`}>
            <Badge variant="success" className="flex items-center gap-1.5 px-3 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Match en direct
            </Badge>
          </Link>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Fans inscrits" value={(totalFans ?? 0).toLocaleString('fr-BE')} icon={Users} trend={{ dir: 'up', label: '+12%' }} />
        <KpiCard label="Check-ins total" value={(totalCheckins ?? 0).toLocaleString('fr-BE')} icon={QrCode} trend={{ dir: 'up', label: '+8%' }} />
        <KpiCard label="Points distribués" value={totalPoints >= 1000 ? `${(totalPoints / 1000).toFixed(1)}k` : String(totalPoints)} icon={TrendingUp} sub="toutes saisons" />
        <KpiCard label="Récompenses échangées" value={(totalRedemptions ?? 0).toString()} icon={Gift} trend={{ dir: 'down', label: '-3%' }} />
      </div>

      {/* Active activations alert */}
      {activeActivations && activeActivations.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
          <Zap className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-amber-400 text-sm">{activeActivations.length} activation{activeActivations.length > 1 ? 's' : ''} en cours</p>
            <p className="text-xs text-gray-400 mt-0.5">Des fans participent maintenant</p>
          </div>
          {nextMatch && (
            <Link href={`/club/live/${nextMatch.id}`} className="text-xs font-medium text-amber-400 hover:underline">
              Contrôler →
            </Link>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Next match */}
        <Card variant="dark">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              {nextMatch?.status === 'live' ? 'Match en cours' : 'Prochain match'}
            </h2>
            {nextMatch ? (
              <Badge variant={nextMatch.status === 'live' ? 'success' : 'info'}>
                {nextMatch.status === 'live' ? '🔴 Live' : new Intl.DateTimeFormat('fr-BE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(nextMatch.match_date))}
              </Badge>
            ) : <Badge variant="neutral">Aucun match prévu</Badge>}
          </div>
          {nextMatch ? (
            <>
              <div className="flex items-center justify-around py-3">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-2xl mx-auto mb-2">🦁</div>
                  <p className="font-bold text-sm">{nextMatch.home_team}</p>
                </div>
                <div className="text-center">
                  {nextMatch.status === 'finished' ? (
                    <span className="text-2xl font-black">{nextMatch.home_score} – {nextMatch.away_score}</span>
                  ) : <span className="text-gray-600 font-black text-xl">VS</span>}
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-purple-600/30 border border-purple-500/30 flex items-center justify-center text-2xl mx-auto mb-2">🦄</div>
                  <p className="font-bold text-sm">{nextMatch.away_team}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Link href={`/club/live/${nextMatch.id}`} className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-sm font-semibold text-center transition-all">
                  {nextMatch.status === 'live' ? 'Gérer le live' : 'Préparer'}
                </Link>
                <Link href="/club/matches" className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium text-center transition-colors">
                  Tous les matchs
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <Link href="/club/matches" className="text-sm text-emerald-400 hover:underline">Créer un match</Link>
            </div>
          )}
        </Card>

        {/* Top Fans */}
        <Card variant="dark">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold">Top Fans</h2>
            <Link href="/club/fans" className="text-xs text-emerald-400 hover:underline">Voir tout</Link>
          </div>
          <div className="space-y-3">
            {topFans?.length ? topFans.map((fan, i) => {
              const level = getLoyaltyLevel(fan.total_points ?? 0)
              return (
                <div key={fan.user_id} className="flex items-center gap-3">
                  <span className="w-6 text-center text-sm">
                    {i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold shrink-0">
                    {fan.full_name?.[0] ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fan.full_name ?? fan.username ?? 'Anonyme'}</p>
                    <p className="text-[10px]" style={{ color: LOYALTY_CONFIG[level].color }}>{LOYALTY_CONFIG[level].name}</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-400">{(fan.total_points ?? 0).toLocaleString('fr-BE')}</span>
                </div>
              )
            }) : (
              <p className="text-gray-500 text-sm text-center py-4">Aucun fan enregistré</p>
            )}
          </div>
        </Card>
      </div>

      {/* Recent activity */}
      <Card variant="dark">
        <h2 className="font-bold mb-4">Activité récente</h2>
        {recentTransactions?.length ? (
          <div className="space-y-2">
            {recentTransactions.map(tx => {
              const profile = (tx as any).profiles
              const typeColors: Record<string, string> = {
                checkin: 'text-emerald-400', pronostic: 'text-blue-400',
                survey: 'text-purple-400', redemption: 'text-red-400', bonus: 'text-amber-400',
              }
              const typeIcons: Record<string, string> = {
                checkin: '📲', pronostic: '⚽', survey: '📊', redemption: '🎁', bonus: '⭐', manual: '✏️', activation: '⚡',
              }
              return (
                <div key={tx.created_at} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                  <span className="text-base">{typeIcons[tx.type] ?? '•'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{tx.description}</p>
                    <p className="text-xs text-gray-500">{profile?.full_name ?? 'Fan'} · {new Intl.DateTimeFormat('fr-BE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(tx.created_at))}</p>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center py-4">Aucune activité récente</p>
        )}
      </Card>
    </div>
  )
}
