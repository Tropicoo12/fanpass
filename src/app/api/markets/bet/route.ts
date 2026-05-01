import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database, MarketOption } from '@/types/database'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { marketId, selection, pointsBet } = await request.json()
  if (!marketId || !selection || !pointsBet || pointsBet < 1) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  }

  const bet = Math.floor(pointsBet)

  const { data: market } = await supabase
    .from('match_markets')
    .select('*')
    .eq('id', marketId)
    .single()

  if (!market) return NextResponse.json({ error: 'Marché introuvable' }, { status: 404 })
  if (!market.is_published) return NextResponse.json({ error: 'Ce marché est fermé.' }, { status: 409 })
  if (market.is_settled) return NextResponse.json({ error: 'Ce marché est déjà réglé.' }, { status: 409 })
  if (market.closes_at && new Date(market.closes_at) < new Date()) {
    return NextResponse.json({ error: 'Les paris sont fermés pour ce marché.' }, { status: 409 })
  }

  const options = market.options as unknown as MarketOption[]
  const chosen = options.find(o => o.key === selection)
  if (!chosen) return NextResponse.json({ error: 'Option invalide' }, { status: 400 })

  // Check no existing bet
  const { data: existing } = await supabase
    .from('match_bets')
    .select('id')
    .eq('user_id', user.id)
    .eq('match_market_id', marketId)
    .maybeSingle()
  if (existing) return NextResponse.json({ error: 'Tu as déjà misé sur ce marché.' }, { status: 409 })

  const { data: fp } = await supabase
    .from('fan_points')
    .select('total_points')
    .eq('user_id', user.id)
    .eq('club_id', market.club_id)
    .maybeSingle()

  if (!fp || fp.total_points < bet) {
    return NextResponse.json({ error: `Solde insuffisant (${fp?.total_points ?? 0} pts disponibles)` }, { status: 409 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Config manquante' }, { status: 500 })

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  )

  const potentialWin = Math.round(bet * chosen.odds)

  const { data: newBet, error: betError } = await admin.from('match_bets').insert({
    user_id: user.id,
    match_market_id: marketId,
    match_id: market.match_id,
    club_id: market.club_id,
    selected_option: selection,
    points_staked: bet,
    odds: chosen.odds,
    potential_win: potentialWin,
  }).select('id').single()

  if (betError) return NextResponse.json({ error: betError.message }, { status: 500 })

  await admin.rpc('award_points', {
    p_user_id: user.id,
    p_club_id: market.club_id,
    p_amount: -bet,
    p_type: 'activation',
    p_reference_id: newBet!.id,
    p_description: `Mise pari : ${chosen.label} (x${chosen.odds.toFixed(2)})`,
  })

  return NextResponse.json({ success: true, betId: newBet!.id, potentialWin })
}
