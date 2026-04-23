import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { matchId, homeScore, awayScore } = await request.json()

  if (matchId === undefined || homeScore === undefined || awayScore === undefined) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  // Vérifier que le match existe et est à venir
  const { data: match } = await supabase
    .from('matches')
    .select('id, status, match_date')
    .eq('id', matchId)
    .single()

  if (!match || match.status !== 'upcoming') {
    return NextResponse.json({ error: 'Pronostics fermés pour ce match' }, { status: 400 })
  }

  // Vérifier pronostic existant
  const { data: existing } = await supabase
    .from('pronostics')
    .select('id')
    .eq('user_id', user.id)
    .eq('match_id', matchId)
    .single()

  if (existing) {
    // Mise à jour
    const { error } = await supabase
      .from('pronostics')
      .update({ predicted_home_score: homeScore, predicted_away_score: awayScore })
      .eq('id', existing.id)

    if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    return NextResponse.json({ success: true, updated: true })
  }

  // Nouveau pronostic
  const { error } = await supabase
    .from('pronostics')
    .insert({
      user_id: user.id,
      match_id: matchId,
      predicted_home_score: homeScore,
      predicted_away_score: awayScore,
    })

  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })

  return NextResponse.json({ success: true, updated: false })
}
