import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Database, MarketOption } from '@/types/database'
import { Card } from '@/components/ui/Card'
import { Trophy } from 'lucide-react'
import { getDefaultClubId } from '@/lib/club'
import { MatchBettingCard } from './MatchBettingCard'

export default async function PronosticsPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const CLUB_ID = (await getDefaultClubId()) ?? ''

  // Upcoming + live matches
  const { data: matches } = await supabase
    .from('matches')
    .select('id, home_team, away_team, match_date, status, venue, odds_home, odds_draw, odds_away')
    .eq('club_id', CLUB_ID)
    .in('status', ['upcoming', 'live'])
    .order('match_date')
    .limit(5)

  const matchIds = matches?.map(m => m.id) ?? []

  const [
    { data: pointsData },
    { data: checkins },
    { data: activeMarkets },
    { data: userBets },
    { data: settledBets },
  ] = await Promise.all([
    supabase.from('fan_points').select('total_points').eq('user_id', user.id).eq('club_id', CLUB_ID).maybeSingle(),
    matchIds.length > 0
      ? supabase.from('checkins').select('match_id').eq('user_id', user.id).in('match_id', matchIds)
      : { data: [] },
    matchIds.length > 0
      ? supabase.from('match_markets').select('*').in('match_id', matchIds).eq('is_published', true).order('created_at')
      : { data: [] },
    matchIds.length > 0
      ? supabase.from('match_bets').select('match_market_id, selected_option, odds, points_staked, is_settled, points_won').eq('user_id', user.id).in('match_id', matchIds)
      : { data: [] },
    supabase.from('match_bets').select('points_staked, points_won, is_settled').eq('user_id', user.id).eq('is_settled', true),
  ])

  const userPoints = pointsData?.total_points ?? 0

  const checkedInMatchIds = new Set(checkins?.map(c => c.match_id) ?? [])

  const betsByMarket: Record<string, {
    selected_option: string; odds: number; points_staked: number; is_settled: boolean; points_won: number | null
  }> = {}
  userBets?.forEach(b => { betsByMarket[b.match_market_id] = b })

  type MarketData = {
    id: string; match_id: string; market_label: string; market_emoji: string
    options: MarketOption[]; is_settled: boolean; closes_at: string | null
    correct_option: string | null
    myBet: typeof betsByMarket[string] | null
  }

  const marketsByMatch: Record<string, MarketData[]> = {}
  activeMarkets?.forEach(m => {
    if (!marketsByMatch[m.match_id]) marketsByMatch[m.match_id] = []
    marketsByMatch[m.match_id].push({
      id: m.id,
      match_id: m.match_id,
      market_label: m.market_label,
      market_emoji: m.market_emoji,
      options: m.options as unknown as MarketOption[],
      is_settled: m.is_settled,
      closes_at: m.closes_at,
      correct_option: m.correct_option,
      myBet: betsByMarket[m.id] ?? null,
    })
  })

  // Stats from settled history
  const totalStaked = settledBets?.reduce((a, b) => a + b.points_staked, 0) ?? 0
  const totalWon = settledBets?.reduce((a, b) => a + (b.points_won ?? 0), 0) ?? 0
  const wonCount = settledBets?.filter(b => (b.points_won ?? 0) > 0).length ?? 0
  const activeBetCount = userBets?.filter(b => !b.is_settled).length ?? 0

  return (
    <div style={{ background: '#f5f5f7', minHeight: '100vh', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: '#ffffff', padding: '20px 16px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1d1d1f', margin: 0 }}>Pronostics</h1>
          <p style={{ fontSize: 13, color: 'rgba(29,29,31,0.55)', margin: '2px 0 0' }}>
            Mise tes points sur les marchés des prochains matchs
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px 0' }}>
        {/* Points balance */}
        <div style={{
          background: '#1d1d1f',
          borderRadius: 16,
          padding: '16px 20px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)', margin: 0 }}>Points disponibles</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: '#ffffff', margin: '2px 0 0', letterSpacing: -0.5 }}>
              {userPoints.toLocaleString('fr-BE')}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', margin: 0 }}>Paris actifs</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '2px 0 0' }}>{activeBetCount}</p>
          </div>
        </div>

        {/* Quick stats */}
        {settledBets && settledBets.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Paris gagnés', value: wonCount, color: '#34c759' },
              { label: 'Pts gagnés', value: `+${totalWon.toLocaleString('fr-BE')}`, color: '#34c759' },
              { label: 'Pts misés', value: totalStaked.toLocaleString('fr-BE'), color: 'rgba(29,29,31,0.55)' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '12px 10px', border: '1px solid rgba(0,0,0,0.06)', textAlign: 'center' }}>
                <p style={{ fontSize: 16, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
                <p style={{ fontSize: 10, color: 'rgba(29,29,31,0.45)', margin: '2px 0 0' }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Match list */}
        {(!matches || matches.length === 0) ? (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', padding: '40px 20px', textAlign: 'center' }}>
            <Trophy size={36} color="rgba(29,29,31,0.20)" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(29,29,31,0.55)', margin: 0 }}>Aucun match à venir</p>
            <p style={{ fontSize: 13, color: 'rgba(29,29,31,0.35)', margin: '4px 0 0' }}>Les paris seront disponibles avant chaque match</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {matches.map(match => (
              <MatchBettingCard
                key={match.id}
                match={match}
                isCheckedIn={checkedInMatchIds.has(match.id)}
                markets={marketsByMatch[match.id] ?? []}
                userPoints={userPoints}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
