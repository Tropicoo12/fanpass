import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import { LOYALTY_CONFIG } from '@/types/database'
import { Card } from '@/components/ui/Card'
import { redirect } from 'next/navigation'
import { getAdminClubId } from '@/lib/club'
import { AnalyticsCharts } from './AnalyticsCharts'
import { AnalyticsAI } from './AnalyticsAI'

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
    { data: checkins },
    { data: activations },
  ] = await Promise.all([
    supabase.from('leaderboard').select('total_points, season_points, loyalty_level, full_name, username').eq('club_id', CLUB_ID),
    supabase.from('points_transactions').select('amount, type, created_at').eq('club_id', CLUB_ID).order('created_at', { ascending: false }).limit(1000),
    supabase.from('matches').select('id, match_date, status, home_team, away_team').eq('club_id', CLUB_ID).order('match_date', { ascending: false }).limit(10),
    supabase.from('checkins').select('match_id, user_id, points_earned'),
    supabase.from('activations').select('id, title, type, response_count, points_reward, status, match_id').eq('club_id', CLUB_ID),
  ])

  // KPIs
  const totalFans = fans?.length ?? 0
  const totalPointsDistributed = transactions?.filter(t => t.amount > 0).reduce((a, t) => a + t.amount, 0) ?? 0
  const totalCheckins = checkins?.length ?? 0

  // Loyalty distribution
  const loyaltyDist = [0, 1, 2, 3, 4].map(level => ({
    name: LOYALTY_CONFIG[level as 0].name,
    count: fans?.filter(f => f.loyalty_level === level).length ?? 0,
    color: LOYALTY_CONFIG[level as 0].color,
  }))

  // Points by type
  const pointsByType: Record<string, number> = {}
  transactions?.forEach(t => {
    if (t.amount > 0) pointsByType[t.type] = (pointsByType[t.type] ?? 0) + t.amount
  })
  const pointsTypeData = Object.entries(pointsByType).map(([type, value]) => ({ type, value }))

  // Checkins per match
  const matchIds = matches?.map(m => m.id) ?? []
  const checkinsByMatch = matchIds.map(id => {
    const match = matches!.find(m => m.id === id)!
    return {
      label: `${match.home_team.slice(0, 3)} vs ${match.away_team.slice(0, 3)}`,
      checkins: checkins?.filter(c => c.match_id === id).length ?? 0,
      points: checkins?.filter(c => c.match_id === id).reduce((a, c) => a + c.points_earned, 0) ?? 0,
    }
  }).reverse()

  // Top 10 fans
  const top10 = [...(fans ?? [])]
    .sort((a, b) => (b.season_points ?? 0) - (a.season_points ?? 0))
    .slice(0, 10)
    .map(f => ({ name: f.full_name ?? f.username ?? 'Anonyme', points: f.season_points ?? 0 }))

  // Activation participation
  const activationData = (activations ?? [])
    .filter(a => a.status === 'closed')
    .slice(0, 8)
    .map(a => ({ name: a.title.slice(0, 20), responses: a.response_count, type: a.type }))

  // Auto insights (computed deterministically)
  const avgCheckins = checkinsByMatch.length > 0
    ? Math.round(checkinsByMatch.reduce((a, m) => a + m.checkins, 0) / checkinsByMatch.length)
    : 0
  const churnRisk = (fans ?? []).filter(f => (f.total_points ?? 0) < 100).length
  const redeemReady = (fans ?? []).filter(f => (f.total_points ?? 0) >= 500).length
  const topActivationType = activationData.sort((a, b) => b.responses - a.responses)[0]

  const autoInsights = [
    {
      emoji: '📊',
      title: 'Engagement matchs',
      body: avgCheckins > 0
        ? `Moyenne de ${avgCheckins} check-in${avgCheckins > 1 ? 's' : ''} par match sur les 10 derniers.`
        : 'Aucun check-in enregistré pour le moment.',
      color: '#1565c0',
    },
    {
      emoji: '⚠️',
      title: 'Risque churn',
      body: churnRisk > 0
        ? `${churnRisk} fan${churnRisk > 1 ? 's' : ''} (${Math.round(churnRisk / Math.max(totalFans, 1) * 100)}%) ont moins de 100 points — pense à les réengager.`
        : 'Tous tes fans sont actifs, aucun risque churn détecté.',
      color: '#c8860a',
    },
    {
      emoji: '🎁',
      title: 'Opportunité récompenses',
      body: redeemReady > 0
        ? `${redeemReady} fan${redeemReady > 1 ? 's ont' : ' a'} assez de points pour échanger une récompense.`
        : 'Aucun fan n\'a encore assez de points pour une récompense.',
      color: '#2e7d32',
    },
    {
      emoji: '⚡',
      title: 'Meilleure activation',
      body: topActivationType
        ? `"${topActivationType.name}" est ton activation la plus populaire avec ${topActivationType.responses} réponse${topActivationType.responses > 1 ? 's' : ''}.`
        : 'Lance des activations pour voir lesquelles résonnent le plus.',
      color: '#6a1b9a',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black" style={{ color: '#1d1d1f' }}>Analytics</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(29,29,31,0.55)' }}>Données d&apos;engagement en temps réel</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total fans', value: totalFans },
          { label: 'Points distribués', value: totalPointsDistributed >= 1000 ? `${(totalPointsDistributed / 1000).toFixed(1)}k` : totalPointsDistributed },
          { label: 'Check-ins total', value: totalCheckins },
          { label: 'Activations', value: activations?.length ?? 0 },
        ].map(s => (
          <Card key={s.label} variant="dark" className="text-center">
            <p className="text-2xl font-black" style={{ color: '#1d1d1f' }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(29,29,31,0.45)' }}>{s.label}</p>
          </Card>
        ))}
      </div>

      <AnalyticsCharts
        loyaltyDist={loyaltyDist}
        checkinsByMatch={checkinsByMatch}
        top10={top10}
        activationData={activationData}
        pointsTypeData={pointsTypeData}
      />

      <AnalyticsAI insights={autoInsights} clubId={CLUB_ID} />
    </div>
  )
}
