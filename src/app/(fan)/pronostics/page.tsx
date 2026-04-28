import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Database, Match, MatchBet, MatchMarket, Pronostic } from '@/types/database'
import { PredictionForm } from './PredictionForm'
import { MarketBetCard } from './MarketBetCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Trophy } from 'lucide-react'
import { getDefaultClubId } from '@/lib/club'

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('fr-BE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

type PronosticHistoryItem = Pronostic & {
  matches: Pick<Match, 'home_team' | 'away_team' | 'match_date' | 'status' | 'home_score' | 'away_score'> | null
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
  const historyItems = (history ?? []) as unknown as PronosticHistoryItem[]
  const openMatchIds = openMatches?.map(match => match.id) ?? []
  const [{ data: publishedMarkets }, { data: userBets }] = await Promise.all([
    openMatchIds.length
      ? supabase
        .from('match_markets')
        .select('*')
        .in('match_id', openMatchIds)
        .eq('is_published', true)
        .eq('is_settled', false)
        .order('created_at', { ascending: false })
      : { data: [] as MatchMarket[] },
    openMatchIds.length
      ? supabase
        .from('match_bets')
        .select('*')
        .eq('user_id', user.id)
        .in('match_id', openMatchIds)
      : { data: [] as MatchBet[] },
  ])

  const marketsByMatch: Record<string, MatchMarket[]> = {}
  publishedMarkets?.forEach(market => {
    if (market.closes_at && new Date(market.closes_at) <= new Date()) return
    marketsByMatch[market.match_id] = [...(marketsByMatch[market.match_id] ?? []), market]
  })

  const betsByMatch: Record<string, MatchBet[]> = {}
  userBets?.forEach(bet => {
    betsByMatch[bet.match_id] = [...(betsByMatch[bet.match_id] ?? []), bet]
  })

  // Map existing pronostics by match_id
  const myPronosByMatch: Record<string, Pronostic> = {}
  historyItems.forEach(p => { myPronosByMatch[p.match_id] = p })

  const pendingCount = historyItems.filter(p => p.result === null).length
  const wonCount = historyItems.filter(p => p.result && p.result !== 'wrong').length
  const totalPts = historyItems.reduce((acc, p) => acc + (p.points_earned ?? 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Pronostics</h1>
        <p className="text-gray-400 text-sm mt-1">Prédit les scores et gagne des points</p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'En attente', value: pendingCount, color: 'text-amber-400' },
          { label: 'Corrects', value: wonCount, color: 'text-emerald-400' },
          { label: 'Points gagnés', value: totalPts, color: 'text-blue-400' },
        ].map(s => (
          <Card key={s.label} variant="dark" className="text-center">
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Open matches */}
      {openMatches && openMatches.length > 0 ? (
        <div>
          <h2 className="font-bold mb-3">Matchs ouverts</h2>
          <div className="space-y-4">
            {openMatches.map(match => (
              <div key={match.id} className="space-y-3">
                <PredictionForm
                  match={match}
                  existing={myPronosByMatch[match.id] ?? null}
                  userPoints={userPoints}
                />
                <MarketBetCard
                  match={match}
                  markets={marketsByMatch[match.id] ?? []}
                  userBets={betsByMatch[match.id] ?? []}
                  userPoints={userPoints}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Card variant="dark" className="text-center py-8">
          <Trophy className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Aucun match ouvert aux pronostics pour le moment</p>
        </Card>
      )}

      {/* History */}
      {historyItems.length > 0 && (
        <div>
          <h2 className="font-bold mb-3">Historique</h2>
          <div className="space-y-2">
            {historyItems.map(p => {
              const match = p.matches
              return (
                <Card key={p.id} variant="dark">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{match?.home_team} vs {match?.away_team}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-gray-400">
                          Pronos : <span className="text-white font-bold">{p.predicted_home_score} – {p.predicted_away_score}</span>
                        </p>
                        {match?.status === 'finished' && match?.home_score !== null && (
                          <p className="text-xs text-gray-400">
                            Résultat : <span className="text-white font-bold">{match.home_score} – {match.away_score}</span>
                          </p>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-600 mt-0.5">{fmtDate(match?.match_date ?? '')}</p>
                    </div>
                    <div className="shrink-0">
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
    </div>
  )
}
