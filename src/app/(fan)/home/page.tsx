import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ScanQrCode, Trophy, Gift, ChevronRight, Zap, Star } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { Database } from '@/types/database'
import { getLoyaltyLevel, getLoyaltyProgress, LOYALTY_CONFIG } from '@/types/database'
import { getDefaultClubId } from '@/lib/club'

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-BE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

export default async function HomePage() {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const CLUB_ID = (await getDefaultClubId()) ?? ''

  const [
    { data: profile },
    { data: pointsData },
    { data: nextMatch },
    { data: recentPronostics },
    { data: liveActivations },
    { data: featuredRewards },
    { data: myCheckins },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    supabase.from('fan_points').select('total_points, season_points, lifetime_points').eq('user_id', user.id).eq('club_id', CLUB_ID).maybeSingle(),
    supabase.from('matches').select('*').eq('club_id', CLUB_ID).in('status', ['upcoming', 'live']).order('match_date').limit(1).maybeSingle(),
    supabase.from('pronostics').select('*, matches(home_team, away_team, match_date, status, home_score, away_score)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
    supabase.from('activations').select('*').eq('status', 'active').eq('club_id', CLUB_ID).limit(3),
    supabase.from('rewards').select('*').eq('club_id', CLUB_ID).eq('is_active', true).order('sort_order').limit(4),
    supabase.from('checkins').select('match_id').eq('user_id', user.id),
  ])

  const totalPoints = pointsData?.total_points ?? 0
  const seasonPoints = pointsData?.season_points ?? 0
  const lifetimePoints = pointsData?.lifetime_points ?? 0
  const loyaltyLevel = getLoyaltyLevel(lifetimePoints)
  const levelConfig = LOYALTY_CONFIG[loyaltyLevel]
  const nextLevel = LOYALTY_CONFIG[Math.min(loyaltyLevel + 1, 4) as 0]
  const progress = getLoyaltyProgress(lifetimePoints)
  const ptsToNext = loyaltyLevel < 4 ? LOYALTY_CONFIG[Math.min(loyaltyLevel + 1, 4) as keyof typeof LOYALTY_CONFIG].min - lifetimePoints : 0

  const checkedInMatchIds = new Set(myCheckins?.map(c => c.match_id) ?? [])
  const alreadyCheckedIn = nextMatch ? checkedInMatchIds.has(nextMatch.id) : false

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Fan'

  return (
    <div className="space-y-6 pb-4">
      {/* Greeting */}
      <div>
        <p className="text-gray-400 text-sm">Bonjour,</p>
        <h1 className="text-2xl font-black">{firstName} 👋</h1>
      </div>

      {/* Points Circle + Loyalty */}
      <Card variant="glass" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />
        <div className="relative flex items-center gap-6">
          {/* SVG Circle */}
          <div className="relative w-24 h-24 shrink-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
              <circle
                cx="48" cy="48" r="40" fill="none"
                stroke={levelConfig.color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress / 100)}`}
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black leading-none">{totalPoints >= 1000 ? (totalPoints / 1000).toFixed(1) + 'k' : totalPoints}</span>
              <span className="text-[9px] text-gray-400 mt-0.5">points</span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-3.5 h-3.5" style={{ color: levelConfig.color }} />
              <span className="text-sm font-bold" style={{ color: levelConfig.color }}>{levelConfig.name}</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Progression niveau</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: levelConfig.color }} />
              </div>
              {ptsToNext > 0 && (
                <p className="text-xs text-gray-500">{ptsToNext.toLocaleString('fr-BE')} pts pour {LOYALTY_CONFIG[Math.min(loyaltyLevel + 1, 4) as keyof typeof LOYALTY_CONFIG].name}</p>
              )}
            </div>
            <div className="flex gap-3 mt-3 text-xs">
              <div>
                <p className="text-gray-400">Saison</p>
                <p className="font-bold">{seasonPoints.toLocaleString('fr-BE')}</p>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <p className="text-gray-400">Total</p>
                <p className="font-bold">{lifetimePoints.toLocaleString('fr-BE')}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Live Activations */}
      {liveActivations && liveActivations.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h2 className="font-bold text-sm">Activations en cours</h2>
          </div>
          <div className="space-y-2">
            {liveActivations.map(act => (
              <Card key={act.id} variant="dark" className="border border-emerald-500/30">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <span className="font-bold text-sm">{act.title}</span>
                    </div>
                    {act.description && <p className="text-xs text-gray-400 mt-1">{act.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-black text-emerald-400">+{act.points_reward}</span>
                    <Link href={`/scan?activation=${act.id}`}>
                      <Badge variant="success">Jouer</Badge>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Next Match */}
      {nextMatch && (
        <Card variant="dark" className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm text-gray-400">Prochain match</h2>
              <Badge variant={nextMatch.status === 'live' ? 'success' : 'info'}>
                {nextMatch.status === 'live' ? 'En direct' : formatDate(nextMatch.match_date)}
              </Badge>
            </div>
            <div className="flex items-center justify-around py-3">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-2xl mx-auto mb-2">🦁</div>
                <p className="font-bold text-sm">{nextMatch.home_team}</p>
              </div>
              <div className="text-center">
                {nextMatch.status === 'finished' ? (
                  <span className="text-2xl font-black">{nextMatch.home_score} - {nextMatch.away_score}</span>
                ) : (
                  <span className="text-gray-600 font-black text-xl">VS</span>
                )}
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-purple-600/30 border border-purple-500/30 flex items-center justify-center text-2xl mx-auto mb-2">🦄</div>
                <p className="font-bold text-sm">{nextMatch.away_team}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              {!alreadyCheckedIn && nextMatch.status === 'live' && (
                <Link href="/scan" className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-sm font-semibold text-center transition-all active:scale-95">
                  Scan QR (+{nextMatch.checkin_points} pts)
                </Link>
              )}
              {alreadyCheckedIn && (
                <div className="flex-1 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-sm font-semibold text-emerald-400 text-center">
                  Check-in validé ✓
                </div>
              )}
              <Link href="/pronostics" className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium text-center transition-colors">
                Pronostic
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { href: '/scan',       icon: ScanQrCode, label: 'Scanner',    color: 'emerald' },
          { href: '/pronostics', icon: Trophy,      label: 'Pronostics', color: 'amber'   },
          { href: '/rewards',    icon: Gift,        label: 'Récompenses', color: 'blue'   },
        ].map(({ href, icon: Icon, label, color }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 hover:bg-white/8 border border-white/5 hover:border-white/10 transition-all active:scale-95 text-center"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${color}-500/15`}>
              <Icon className={`w-5 h-5 text-${color}-400`} />
            </div>
            <span className="text-xs font-medium text-gray-300">{label}</span>
          </Link>
        ))}
      </div>

      {/* Recent Predictions */}
      {recentPronostics && recentPronostics.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">Mes pronostics récents</h2>
            <Link href="/pronostics" className="text-xs text-emerald-400 flex items-center gap-1">
              Voir tout <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentPronostics.map((p) => {
              const match = (p as any).matches
              return (
                <Card key={p.id} variant="dark">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {match?.home_team} - {match?.away_team}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Pronostic : {p.predicted_home_score} - {p.predicted_away_score}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {p.result === 'exact' && <Badge variant="success">Exact +{p.points_earned}</Badge>}
                      {p.result === 'winner' && <Badge variant="info">Vainqueur +{p.points_earned}</Badge>}
                      {p.result === 'wrong' && <Badge variant="error">Raté</Badge>}
                      {!p.result && <Badge variant="neutral">En attente</Badge>}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Featured Rewards */}
      {featuredRewards && featuredRewards.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">Récompenses vedettes</h2>
            <Link href="/rewards" className="text-xs text-emerald-400 flex items-center gap-1">
              Catalogue <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {featuredRewards.map(r => {
              const canAfford = totalPoints >= r.points_cost
              return (
                <Link
                  key={r.id}
                  href="/rewards"
                  className="shrink-0 w-40 bg-white/5 rounded-2xl p-3 border border-white/5 hover:border-white/10 transition-all"
                >
                  <div className="text-3xl mb-2">{r.category === 'merchandise' ? '👕' : r.category === 'experience' ? '🏆' : r.category === 'discount' ? '🏷️' : r.category === 'vip' ? '🎫' : '🖼️'}</div>
                  <p className="text-sm font-bold leading-tight line-clamp-2">{r.title}</p>
                  <p className={`text-sm font-black mt-2 ${canAfford ? 'text-emerald-400' : 'text-gray-500'}`}>
                    {r.points_cost.toLocaleString('fr-BE')} pts
                  </p>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
