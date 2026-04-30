import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database, MarketOption } from '@/types/database'

export async function POST(request: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { matchId } = await params
  const body = await request.json()
  const { market_id, selected_option, points_staked } = body

  if (!market_id || !selected_option || !points_staked || points_staked <= 0) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  // Verify market is published and not closed
  const { data: market } = await supabase
    .from('match_markets')
    .select('*')
    .eq('id', market_id)
    .eq('match_id', matchId)
    .eq('is_published', true)
    .eq('is_settled', false)
    .single()

  if (!market) return NextResponse.json({ error: 'Marché indisponible' }, { status: 404 })

  // Check market hasn't closed
  if (market.closes_at && new Date(market.closes_at) < new Date()) {
    return NextResponse.json({ error: 'Marché fermé' }, { status: 400 })
  }

  // Find option and its odds
  const options = market.options as unknown as MarketOption[]
  const option = options.find(o => o.key === selected_option)
  if (!option) return NextResponse.json({ error: 'Option invalide' }, { status: 400 })

  // Check fan has enough points
  const { data: fanPoints } = await supabase
    .from('fan_points')
    .select('total_points')
    .eq('user_id', user.id)
    .eq('club_id', market.club_id)
    .single()

  if (!fanPoints || fanPoints.total_points < points_staked) {
    return NextResponse.json({ error: 'Points insuffisants' }, { status: 400 })
  }

  const potentialWin = Math.round(points_staked * option.odds)

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Insert bet
  const { data: bet, error: betError } = await admin
    .from('match_bets')
    .insert({
      user_id: user.id,
      match_market_id: market_id,
      match_id: matchId,
      club_id: market.club_id,
      selected_option,
      points_staked,
      odds: option.odds,
      potential_win: potentialWin,
    })
    .select()
    .single()

  if (betError) {
    if (betError.code === '23505') {
      return NextResponse.json({ error: 'Pari déjà placé sur ce marché' }, { status: 400 })
    }
    console.error('[bet POST]', betError.code, betError.message)
    return NextResponse.json({ error: 'Erreur placement du pari' }, { status: 500 })
  }

  // Deduct points
  await admin.rpc('award_points', {
    p_user_id: user.id,
    p_club_id: market.club_id,
    p_amount: -points_staked,
    p_type: 'activation',
    p_reference_id: market_id,
    p_description: `Pari : ${market.market_label} — ${option.label}`,
  })

  // Increment bet_count
  await admin
    .from('match_markets')
    .update({ bet_count: (market.bet_count ?? 0) + 1 })
    .eq('id', market_id)

  return NextResponse.json({ bet })
}
