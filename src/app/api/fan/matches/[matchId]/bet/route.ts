import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type MarketOption = { key: string; label: string; odds: number }

function parseOptions(value: unknown): MarketOption[] {
  return Array.isArray(value)
    ? value.filter((option): option is MarketOption => {
      if (!option || typeof option !== 'object') return false
      const item = option as Record<string, unknown>
      return typeof item.key === 'string' && typeof item.label === 'string' && typeof item.odds === 'number'
    })
    : []
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { matchId } = await params
  const body = await request.json()
  const marketId = String(body.marketId ?? '').trim()
  const selectedOption = String(body.selectedOption ?? '').trim()
  const pointsStaked = Math.floor(Number(body.pointsStaked))

  if (!marketId || !selectedOption || !Number.isFinite(pointsStaked) || pointsStaked <= 0) {
    return NextResponse.json({ error: 'Mise invalide' }, { status: 400 })
  }

  const { data: market } = await supabase
    .from('match_markets')
    .select('*')
    .eq('id', marketId)
    .eq('match_id', matchId)
    .single()

  if (!market) return NextResponse.json({ error: 'Marché introuvable' }, { status: 404 })
  if (!market.is_published || market.is_settled) {
    return NextResponse.json({ error: 'Ce marché est fermé' }, { status: 409 })
  }
  if (market.closes_at && new Date(market.closes_at) <= new Date()) {
    return NextResponse.json({ error: 'Ce marché est expiré' }, { status: 409 })
  }

  const option = parseOptions(market.options).find(item => item.key === selectedOption)
  if (!option) return NextResponse.json({ error: 'Option invalide' }, { status: 400 })

  const { data: pointsData } = await supabase
    .from('fan_points')
    .select('total_points')
    .eq('user_id', user.id)
    .eq('club_id', market.club_id)
    .maybeSingle()

  const availablePoints = pointsData?.total_points ?? 0
  if (availablePoints < pointsStaked) {
    return NextResponse.json({ error: `Solde insuffisant (${availablePoints} pts disponibles)` }, { status: 409 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    console.error('[fan bet] SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 })
  }

  const admin = createAdminClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
  const potentialWin = Math.round(pointsStaked * option.odds)

  const { data: bet, error: insertError } = await admin
    .from('match_bets')
    .insert({
      user_id: user.id,
      match_market_id: market.id,
      match_id: market.match_id,
      club_id: market.club_id,
      selected_option: option.key,
      points_staked: pointsStaked,
      odds: option.odds,
      potential_win: potentialWin,
    })
    .select()
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'Tu as déjà misé sur ce marché' }, { status: 409 })
    }
    console.error('[fan bet] insert error:', insertError.code, insertError.message)
    return NextResponse.json({ error: `Erreur DB: ${insertError.message}` }, { status: 500 })
  }

  const { error: deductError } = await admin.rpc('award_points', {
    p_user_id: user.id,
    p_club_id: market.club_id,
    p_amount: -pointsStaked,
    p_type: 'pronostic',
    p_reference_id: bet.id,
    p_description: `Mise marché : ${market.market_label}`,
  })

  if (deductError) {
    await admin.from('match_bets').delete().eq('id', bet.id)
    console.error('[fan bet] deduct error:', deductError.code, deductError.message)
    return NextResponse.json({ error: 'Impossible de débiter les points' }, { status: 500 })
  }

  await admin
    .from('match_markets')
    .update({ bet_count: market.bet_count + 1 })
    .eq('id', market.id)

  return NextResponse.json({ success: true, bet })
}
