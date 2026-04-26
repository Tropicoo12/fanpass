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

  // Fetch market
  const { data: market } = await supabase
    .from('match_markets')
    .select('*')
    .eq('id', marketId)
    .single()

  if (!market) return NextResponse.json({ error: 'Marché introuvable' }, { status: 404 })
  if (market.status !== 'open') return NextResponse.json({ error: 'Ce marché est fermé.' }, { status: 409 })
  if (!market.is_active) return NextResponse.json({ error: 'Ce marché n\'est pas actif.' }, { status: 409 })
  if (bet < market.min_bet) return NextResponse.json({ error: `Mise minimum : ${market.min_bet} pts` }, { status: 400 })
  if (bet > market.max_bet) return NextResponse.json({ error: `Mise maximum : ${market.max_bet} pts` }, { status: 400 })

  // Validate selection exists in options
  const options = market.options as MarketOption[]
  const chosen = options.find(o => o.name === selection)
  if (!chosen) return NextResponse.json({ error: 'Option invalide' }, { status: 400 })

  // Check no existing bet
  const { data: existing } = await supabase
    .from('market_bets')
    .select('id')
    .eq('user_id', user.id)
    .eq('market_id', marketId)
    .maybeSingle()
  if (existing) return NextResponse.json({ error: 'Tu as déjà misé sur ce marché.' }, { status: 409 })

  // Check balance
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

  // Insert bet
  const { data: newBet, error: betError } = await admin.from('market_bets').insert({
    user_id: user.id,
    market_id: marketId,
    match_id: market.match_id,
    club_id: market.club_id,
    selection,
    odds_at_bet: chosen.odds,
    points_bet: bet,
    status: 'pending',
  }).select('id').single()

  if (betError) {
    console.error('[markets/bet POST]', betError.code, betError.message)
    return NextResponse.json({ error: betError.message }, { status: 500 })
  }

  // Deduct points immediately
  const { error: deductError } = await admin.rpc('award_points', {
    p_user_id: user.id,
    p_club_id: market.club_id,
    p_amount: -bet,
    p_type: 'pronostic',
    p_reference_id: newBet!.id,
    p_description: `Mise pari : ${selection} (x${chosen.odds.toFixed(2)})`,
  })

  if (deductError) {
    console.error('[markets/bet deduct]', deductError.code, deductError.message)
  }

  return NextResponse.json({
    success: true,
    betId: newBet!.id,
    potentialWin: Math.round(bet * chosen.odds),
  })
}
