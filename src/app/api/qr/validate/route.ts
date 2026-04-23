import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { token } = await request.json()
  if (!token) {
    return NextResponse.json({ error: 'Token manquant' }, { status: 400 })
  }

  // Trouver le match correspondant au token QR
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('id, club_id, home_team, away_team, match_date, status')
    .eq('qr_code_token', token)
    .single()

  if (matchError || !match) {
    return NextResponse.json({ error: 'QR code invalide' }, { status: 404 })
  }

  if (match.status !== 'live' && match.status !== 'upcoming') {
    return NextResponse.json({ error: 'Ce match n\'est plus disponible' }, { status: 400 })
  }

  // Vérifier si déjà check-in
  const { data: existing } = await supabase
    .from('checkins')
    .select('id')
    .eq('user_id', user.id)
    .eq('match_id', match.id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Déjà scanné pour ce match' }, { status: 409 })
  }

  const CHECKIN_POINTS = 50

  // Créer le check-in
  const { error: checkinError } = await supabase
    .from('checkins')
    .insert({
      user_id: user.id,
      match_id: match.id,
      points_earned: CHECKIN_POINTS,
    })

  if (checkinError) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    match,
    pointsEarned: CHECKIN_POINTS,
  })
}
