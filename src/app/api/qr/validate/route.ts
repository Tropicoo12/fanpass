import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json()
  const { token, lat, lng } = body
  if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 400 })

  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('qr_code_token', token.trim())
    .single()

  if (!match) return NextResponse.json({ error: 'QR code invalide ou expiré.' }, { status: 404 })

  if (!['upcoming', 'live'].includes(match.status)) {
    return NextResponse.json({ error: 'Ce match n\'est pas ouvert au check-in.' }, { status: 409 })
  }

  const now = new Date()
  if (match.checkin_opens_at && new Date(match.checkin_opens_at) > now) {
    return NextResponse.json({ error: 'Le check-in n\'est pas encore ouvert.' }, { status: 409 })
  }
  if (match.checkin_closes_at && new Date(match.checkin_closes_at) < now) {
    return NextResponse.json({ error: 'La fenêtre de check-in est fermée.' }, { status: 409 })
  }

  const { data: existing } = await supabase
    .from('checkins')
    .select('id')
    .eq('user_id', user.id)
    .eq('match_id', match.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Tu as déjà scanné ce match. Un seul check-in par rencontre.' }, { status: 409 })
  }

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error: checkinError } = await admin.from('checkins').insert({
    user_id: user.id,
    match_id: match.id,
    points_earned: match.checkin_points,
    lat: lat ?? null,
    lng: lng ?? null,
  })

  if (checkinError) {
    if (checkinError.code === '23505') {
      return NextResponse.json({ error: 'Tu as déjà scanné ce match.' }, { status: 409 })
    }
    console.error('checkin error:', checkinError)
    return NextResponse.json({ error: 'Erreur lors du check-in.' }, { status: 500 })
  }

  await admin.rpc('award_points', {
    p_user_id: user.id,
    p_club_id: match.club_id,
    p_amount: match.checkin_points,
    p_type: 'checkin',
    p_reference_id: match.id,
    p_description: `Check-in : ${match.home_team} vs ${match.away_team}`,
  })

  return NextResponse.json({
    success: true,
    pointsEarned: match.checkin_points,
    match: { home_team: match.home_team, away_team: match.away_team, venue: match.venue },
  })
}
