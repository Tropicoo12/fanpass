import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Database, Pronostic, MarketOption } from '@/types/database'
import { PredictionForm } from './PredictionForm'
import { MarketBetCard } from './MarketBetCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Trophy, TrendingUp } from 'lucide-react'
import { getDefaultClubId } from '@/lib/club'

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('fr-BE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

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

  const [{ data: openMatches }, { data: history }, { data: pointsData }] = await Promise.all([
    supabase.from('matches').select('*').eq('club_id', CLUB_ID).in('status', ['upcoming', 'live']).order('match_date').limit(5),
    supabase.from('pronostics').select('*, matches(home_team, away_team, match_date, status, home_score, away_score)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('fan_points').select('total_points').eq('user_id', user.id).eq('club_id', CLUB_ID).maybeSingle(),
  ])

  const userPoints = pointsData?.total_points ?? 0
  const matchIds = openMatches?.map(m => m.id) ?? []

  // Fetch published markets + user's bets
  const [{ data: activeMarkets }, { data: userBets }] = await Promise.all([
    matchIds.length > 0
      ? supabase.from('match_markets').select('*').in('match_id', matchIds).eq('is_published', true).order('created_at')
      : { data: [] },
    matchIds.length > 0
      ? supabase.from('match_bets').select('match_market_id, selected_option, odds, points_staked, is_settled, points_won').eq('user_id', user.id)
      : { data: [] },
  ])

  const betsByMarket: Record<string, { selected_option: string; odds: number; points_staked: number; is_settled: boolean; points_won: number | null }> = {}
  userBets?.forEach(b => { betsByMarket[b.match_market_id] = b })

  const marketsByMatch: Record<string, Array<{
    id: string; match_id: string; market_label: string; market_emoji: string
    options: MarketOption[]; is_settled: boolean; closes_at: string | null
    correct_option: string | null
    myBet: typeof betsByMarket[string] | null
  }>> = {}

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

  const myPronosByMatch: Record<string, Pronostic> = {}
  history?.forEach(p => { myPronosByMatch[p.match_id] = p })

  const pendingCount = history?.filter(p => p.result === null).length ?? 0
  const wonCount = history?.filter(p => p.result && p.result !== 'wrong').length ?? 0
  const totalPts = history?.reduce((acc, p) => acc + (p.points_earned ?? 0), 0) ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Pronostics</h1>
        <p className="text-gray-400 text-sm mt-1">Prédit les scores et mise tes points</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'En attente', value: pendingCount, color: 'text-amber-400' },
          { label: 'Corrects',   value: wonCount,     color: 'text-emerald-400' },
          { label: 'Pts gagnés', value: totalPts,     color: 'text-blue-400' },
        ].map(s => (
          <Card key={s.label} variant="dark" className="text-center">
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {(!openMatches || openMatches.length === 0) && (
        <Card variant="dark" className="text-center py-8">
          <Trophy className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Aucun match ouvert aux pronostics</p>
        </Card>
      )}

      {openMatches?.map(match => {
        const matchMarkets = marketsByMatch[match.id] ?? []
        return (
          <div key={match.id} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="font-bold">{match.home_team} vs {match.away_team}</p>
                <p className="text-xs text-gray-500">{fmtDate(match.match_date)}</p>
              </div>
              {match.status === 'live' && <Badge variant="success">Live</Badge>}
            </div>

            {matchMarkets.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Marchés de paris</p>
                </div>
                {matchMarkets.map(m => (
                  <MarketBetCard key={m.id} market={m} userPoints={userPoints} />
                ))}
              </div>
            )}

            <PredictionForm match={match} existing={myPronosByMatch[match.id] ?? null} userPoints={userPoints} />
          </div>
        )
      })}

      {history && history.length > 0 && (
        <div>
          <h2 className="font-bold mb-3">Historique scores</h2>
          <div className="space-y-2">
            {history.map(p => {
              const match = (p as any).matches
              return (
                <Card key={p.id} variant="dark">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{match?.home_team} vs {match?.away_team}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-gray-400">Pronos : <span className="text-white font-bold">{p.predicted_home_score} – {p.predicted_away_score}</span></p>
                        {match?.status === 'finished' && match?.home_score !== null && (
                          <p className="text-xs text-gray-400">Résultat : <span className="text-white font-bold">{match.home_score} – {match.away_score}</span></p>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {p.result === 'exact'  && <Badge variant="success">Exact +{p.points_earned}</Badge>}
                      {p.result === 'winner' && <Badge variant="info">Vainqueur +{p.points_earned}</Badge>}
                      {p.result === 'wrong'  && <Badge variant="error">Raté</Badge>}
                      {!p.result             && <Badge variant="neutral">En attente</Badge>}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
