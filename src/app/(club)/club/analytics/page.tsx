import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import { getLoyaltyLevel, LOYALTY_CONFIG } from '@/types/database'
import { Card } from '@/components/ui/Card'
import { redirect } from 'next/navigation'
import { getAdminClubId } from '@/lib/club'

function Pct({ value, color = '#10b981' }: { value: number; color?: string }) {
  return (
    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, value)}%`, background: color }} />
    </div>
  )
}

export default async function AnalyticsPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const CLUB_ID = await getAdminClubId()
  if (!CLUB_ID) redirect('/auth/login')

  const [
    { data: fans },
    { data: transactions },
    { data: matches },
    { data: surveys },
    { data: activations },
  ] = await Promise.all([
    supabase.from('leaderboard').select('total_points, loyalty_level').eq('club_id', CLUB_ID),
    supabase.from('points_transactions').select('amount, type, created_at').eq('club_id', CLUB_ID).order('created_at', { ascending: false }).limit(500),
    supabase.from('matches').select('id, match_date, status, home_team, away_team').eq('club_id', CLUB_ID).order('match_date', { ascending: false }).limit(10),
    supabase.from('surveys').select('id, title, response_count, points_reward').eq('club_id', CLUB_ID),
    supabase.from('activations').select('id, title, type, response_count, points_reward, status').eq('club_id', CLUB_ID),
  ])

  // Loyalty distribution
  const loyaltyDist: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 }
  fans?.forEach(f => { loyaltyDist[f.loyalty_level ?? 0]++ })
  const totalFans = fans?.length ?? 1

  // Points by type
  const pointsByType: Record<string, number> = {}
  transactions?.forEach(t => {
    if (t.amount > 0) pointsByType[t.type] = (pointsByType[t.type] ?? 0) + t.amount
  })
  const totalPoints = Object.values(pointsByType).reduce((a, b) => a + b, 0) || 1

  // Engagement rate (fans with at least one tx / total fans)
  const activeFanIds = new Set(transactions?.map(t => t.type))
  const engagementRate = fans?.length ? Math.round((transactions?.length ?? 0) / Math.max(fans.length, 1) * 10) : 0

  // Sponsor performance
  const topSurveys = [...(surveys ?? [])].sort((a, b) => b.response_count - a.response_count).slice(0, 5)

  // Match checkin trend (dummy from transactions)
  const matchStats = matches?.map(m => ({
    label: `${m.home_team.slice(0, 3)} vs ${m.away_team.slice(0, 3)}`,
    date: new Intl.DateTimeFormat('fr-BE', { day: 'numeric', month: 'short' }).format(new Date(m.match_date)),
    status: m.status,
  }))

  const TYPE_LABELS: Record<string, string> = {
    checkin: '📲 Check-ins', pronostic: '⚽ Pronostics', survey: '📊 Sondages',
    activation: '⚡ Activations', bonus: '⭐ Bonus', redemption: '🎁 Échanges', manual: '✏️ Manuel',
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black">Analytics</h1>
        <p className="text-gray-400 text-sm mt-1">Vue globale des performances d'engagement</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total fans', value: totalFans },
          { label: 'Points distribués', value: totalPoints >= 1000 ? `${(totalPoints / 1000).toFixed(1)}k` : totalPoints },
          { label: 'Taux engagement', value: `${Math.min(100, engagementRate)}%` },
          { label: 'Sondages actifs', value: surveys?.filter(s => true).length ?? 0 },
        ].map(s => (
          <Card key={s.label} variant="dark" className="text-center">
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Loyalty distribution */}
      <Card variant="dark">
        <h2 className="font-bold mb-4">Distribution des niveaux</h2>
        <div className="space-y-3">
          {([4, 3, 2, 1, 0] as const).map(level => {
            const count = loyaltyDist[level]
            const pct = Math.round((count / totalFans) * 100)
            const cfg = LOYALTY_CONFIG[level]
            return (
              <div key={level} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium" style={{ color: cfg.color }}>{cfg.name}</span>
                  <span className="text-gray-400">{count} fans ({pct}%)</span>
                </div>
                <Pct value={pct} color={cfg.color} />
              </div>
            )
          })}
        </div>
      </Card>

      {/* Points distribution by type */}
      <Card variant="dark">
        <h2 className="font-bold mb-4">Points distribués par source</h2>
        <div className="space-y-3">
          {Object.entries(pointsByType).sort((a, b) => b[1] - a[1]).map(([type, pts]) => {
            const pct = Math.round((pts / totalPoints) * 100)
            return (
              <div key={type} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{TYPE_LABELS[type] ?? type}</span>
                  <span className="text-gray-400">{pts.toLocaleString('fr-BE')} pts ({pct}%)</span>
                </div>
                <Pct value={pct} />
              </div>
            )
          })}
          {Object.keys(pointsByType).length === 0 && (
            <p className="text-gray-500 text-sm text-center py-2">Aucune donnée encore</p>
          )}
        </div>
      </Card>

      {/* Sponsor performance */}
      {topSurveys.length > 0 && (
        <Card variant="dark">
          <h2 className="font-bold mb-4">Performance sponsors (top sondages)</h2>
          <div className="space-y-3">
            {topSurveys.map(s => (
              <div key={s.id} className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-gray-400">{s.response_count} réponses · +{s.points_reward} pts</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-emerald-400">{(s.response_count * s.points_reward).toLocaleString('fr-BE')}</p>
                  <p className="text-[10px] text-gray-500">pts distribués</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Activation stats */}
      {activations && activations.length > 0 && (
        <Card variant="dark">
          <h2 className="font-bold mb-4">Activations</h2>
          <div className="space-y-2">
            {activations.slice(0, 10).map(a => (
              <div key={a.id} className="flex items-center gap-3 py-1">
                <span className="text-sm">{a.type === 'trivia' ? '🧠' : a.type === 'poll' ? '📊' : a.type === 'moment' ? '📸' : '⚽'}</span>
                <div className="flex-1">
                  <p className="text-sm">{a.title}</p>
                </div>
                <span className="text-sm text-gray-400">{a.response_count} part.</span>
                <span className="text-sm font-bold text-emerald-400">+{a.points_reward}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
