import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { matchId, homeScore, awayScore } = await request.json()

  if (matchId === undefined || homeScore === undefined || awayScore === undefined) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }
  if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0 || homeScore > 20 || awayScore > 20) {
    return NextResponse.json({ error: 'Score invalide (0-20)' }, { status: 400 })
  }

  const { data: match } = await supabase
    .from('matches')
    .select('id, status')
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
    if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    return NextResponse.json({ success: true, updated: true })
  }

  const { error } = await supabase
    .from('pronostics')
    .insert({ user_id: user.id, match_id: matchId, predicted_home_score: homeScore, predicted_away_score: awayScore })

  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  return NextResponse.json({ success: true, updated: false })
}
