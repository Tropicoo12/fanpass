import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database, MarketOption } from '@/types/database'

function adminClient() {
  return createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  // Vercel cron sends Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = adminClient()
  const results = { closedMarkets: 0, settledMarkets: 0, settledPronostics: 0 }

  // 1. Close markets whose closes_at has passed
  const { data: expiredMarkets } = await admin
    .from('match_markets')
    .select('id')
    .eq('is_published', true)
    .eq('is_settled', false)
    .lt('closes_at', new Date().toISOString())
    .not('closes_at', 'is', null)

  if (expiredMarkets?.length) {
    await admin
      .from('match_markets')
      .update({ is_published: false } as any)
      .in('id', expiredMarkets.map(m => m.id))
    results.closedMarkets = expiredMarkets.length
  }

  // 2. Settle markets that have correct_option set but aren't settled yet
  const { data: pendingMarkets } = await admin
    .from('match_markets')
    .select('*')
    .eq('is_settled', false)
    .not('correct_option', 'is', null)

  for (const market of pendingMarkets ?? []) {
    const { data: bets } = await admin
      .from('match_bets')
      .select('*')
      .eq('match_market_id', market.id)
      .eq('is_settled', false)

    for (const bet of bets ?? []) {
      const isCorrect = bet.selected_option === market.correct_option
      const pointsWon = isCorrect ? bet.potential_win : 0

      await admin.from('match_bets').update({
        is_settled: true,
        is_correct: isCorrect,
        points_won: pointsWon,
      }).eq('id', bet.id)

      if (isCorrect) {
        const opts = market.options as unknown as MarketOption[]
        const opt = opts.find(o => o.key === market.correct_option)
        await admin.rpc('award_points', {
          p_user_id: bet.user_id,
          p_club_id: bet.club_id,
          p_amount: pointsWon,
          p_type: 'activation',
          p_reference_id: bet.match_market_id,
          p_description: `Pari gagnant : ${opt?.label ?? market.market_label}`,
        })
      }
    }

    await admin.from('match_markets').update({ is_settled: true } as any).eq('id', market.id)
    results.settledMarkets++
  }

  // 3. Settle pronostics for finished matches
  const { data: finishedMatches } = await admin
    .from('matches')
    .select('id, club_id, home_score, away_score, prediction_points_exact, prediction_points_winner')
    .eq('status', 'finished')
    .not('home_score', 'is', null)
    .not('away_score', 'is', null)

  for (const match of finishedMatches ?? []) {
    const { data: ungraded } = await admin
      .from('pronostics')
      .select('*')
      .eq('match_id', match.id)
      .is('result', null)

    for (const p of ungraded ?? []) {
      const h = match.home_score!
      const a = match.away_score!
      let result: string
      let pts: number

      if (p.predicted_home_score === h && p.predicted_away_score === a) {
        result = 'exact'; pts = match.prediction_points_exact
      } else {
        const predWinner = p.predicted_home_score > p.predicted_away_score ? 'home'
          : p.predicted_home_score < p.predicted_away_score ? 'away' : 'draw'
        const actualWinner = h > a ? 'home' : h < a ? 'away' : 'draw'
        result = predWinner === actualWinner ? 'winner' : 'wrong'
        pts = result === 'winner' ? match.prediction_points_winner : 0
      }

      await admin.from('pronostics').update({
        result, points_earned: pts, is_correct: result !== 'wrong',
      }).eq('id', p.id)

      if (pts > 0) {
        await admin.rpc('award_points', {
          p_user_id: p.user_id,
          p_club_id: match.club_id,
          p_amount: pts,
          p_type: 'pronostic',
          p_reference_id: match.id,
          p_description: result === 'exact' ? 'Score exact prédit !' : 'Vainqueur prédit !',
        })
      }
      results.settledPronostics++
    }
  }

  return NextResponse.json({ ok: true, ...results })
}
