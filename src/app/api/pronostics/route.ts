import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { matchId, homeScore, awayScore, pointsBet, oddsMultiplier } = await request.json()

  if (matchId === undefined || homeScore === undefined || awayScore === undefined) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }
  if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0 || homeScore > 20 || awayScore > 20) {
    return NextResponse.json({ error: 'Score invalide (0-20)' }, { status: 400 })
  }

  const bet = typeof pointsBet === 'number' && pointsBet > 0 ? Math.floor(pointsBet) : 0
  const multiplier = typeof oddsMultiplier === 'number' && oddsMultiplier > 0 ? oddsMultiplier : null

  const { data: match } = await supabase
    .from('matches')
    .select('id, status, club_id')
    .eq('id', matchId)
    .single()

  if (!match) return NextResponse.json({ error: 'Match introuvable' }, { status: 404 })
  if (match.status !== 'upcoming') {
    return NextResponse.json({ error: 'Les pronostics sont fermés pour ce match.' }, { status: 409 })
  }

  const { data: existing } = await supabase
    .from('pronostics')
    .select('id')
    .eq('user_id', user.id)
    .eq('match_id', matchId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('pronostics')
      .update({ predicted_home_score: homeScore, predicted_away_score: awayScore, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) {
      console.error('[pronostics PATCH] error:', error.code, error.message)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }
    return NextResponse.json({ success: true, updated: true })
  }

  // Check balance if bet requested
  if (bet > 0) {
    const { data: fp } = await supabase
      .from('fan_points')
      .select('total_points')
      .eq('user_id', user.id)
      .eq('club_id', match.club_id)
      .maybeSingle()

    if (!fp || fp.total_points < bet) {
      return NextResponse.json({ error: `Solde insuffisant (${fp?.total_points ?? 0} pts disponibles)` }, { status: 409 })
    }
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    console.error('[pronostics POST] SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 })
  }

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  )

  const { data: newProno, error } = await admin
    .from('pronostics')
    .insert({
      user_id: user.id,
      match_id: matchId,
      predicted_home_score: homeScore,
      predicted_away_score: awayScore,
      points_bet: bet > 0 ? bet : null,
      odds_multiplier: bet > 0 ? multiplier : null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[pronostics POST] insert error:', error.code, error.message)
    return NextResponse.json({ error: `Erreur DB: ${error.message}` }, { status: 500 })
  }

  // Deduct bet points immediately
  if (bet > 0) {
    const { error: deductError } = await admin.rpc('award_points', {
      p_user_id: user.id,
      p_club_id: match.club_id,
      p_amount: -bet,
      p_type: 'pronostic',
      p_reference_id: newProno.id,
      p_description: `Mise pronostic (cote x${multiplier?.toFixed(2) ?? '?'})`,
    })
    if (deductError) {
      console.error('[pronostics POST] deduct error:', deductError.code, deductError.message)
    }
  }

  return NextResponse.json({ success: true, updated: false })
}
