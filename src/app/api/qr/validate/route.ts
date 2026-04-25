import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { generateRotatingToken, currentWindow } from '@/app/api/club/matches/[matchId]/live-token/route'

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json()
  const { token, lat, lng, deviceId } = body
  if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 400 })

  let match: Database['public']['Tables']['matches']['Row'] | null = null

  // --- Layer 1: Rotating HMAC token (format: "matchId:TOKEN") ---
  if (token.includes(':')) {
    const [matchId, rotatingToken] = token.split(':')
    const win = currentWindow()

    // Accept current window and the previous one (grace period)
    const validTokens = [
      generateRotatingToken(matchId, win),
      generateRotatingToken(matchId, win - 1),
    ]

    if (!validTokens.includes(rotatingToken)) {
      return NextResponse.json({ error: 'QR code expiré ou invalide. Scanne le code affiché à l\'écran.' }, { status: 401 })
    }

    const { data } = await supabase.from('matches').select('*').eq('id', matchId).single()
    match = data
  } else {
    // --- Fallback: static qr_code_token (legacy / dev) ---
    const { data } = await supabase
      .from('matches')
      .select('*')
      .eq('qr_code_token', token.trim())
      .single()
    match = data
  }

  if (!match) return NextResponse.json({ error: 'QR code invalide.' }, { status: 404 })

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

  // --- Layer 2: GPS geofence validation ---
  if (match.geofence_lat !== null && match.geofence_lng !== null) {
    if (lat == null || lng == null) {
      return NextResponse.json({
        error: 'Localisation requise. Active le GPS et réessaie.',
        requiresGps: true,
      }, { status: 403 })
    }
    const radius = match.geofence_radius_m ?? 500
    const distance = haversineMeters(lat, lng, match.geofence_lat, match.geofence_lng)
    if (distance > radius) {
      return NextResponse.json({
        error: `Tu es trop loin du stade (${Math.round(distance)}m). Le check-in nécessite d\'être à moins de ${radius}m.`,
        distance: Math.round(distance),
      }, { status: 403 })
    }
  }

  // --- Layer 3: One check-in per account per match ---
  const { data: existing } = await supabase
    .from('checkins')
    .select('id')
    .eq('user_id', user.id)
    .eq('match_id', match.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Tu as déjà scanné ce match. Un seul check-in par rencontre.' }, { status: 409 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    console.error('[qr/validate] SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json({ error: 'Configuration serveur manquante.' }, { status: 500 })
  }

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  )

  const { error: checkinError } = await admin.from('checkins').insert({
    user_id: user.id,
    match_id: match.id,
    points_earned: match.checkin_points,
    lat: lat ?? null,
    lng: lng ?? null,
    device_id: deviceId ?? null,
  })

  if (checkinError) {
    if (checkinError.code === '23505') {
      return NextResponse.json({ error: 'Tu as déjà scanné ce match.' }, { status: 409 })
    }
    console.error('[qr/validate] checkin insert error:', checkinError.code, checkinError.message)
    return NextResponse.json({ error: `Erreur lors du check-in: ${checkinError.message}` }, { status: 500 })
  }

  const { error: pointsError } = await admin.rpc('award_points', {
    p_user_id: user.id,
    p_club_id: match.club_id,
    p_amount: match.checkin_points,
    p_type: 'checkin',
    p_reference_id: match.id,
    p_description: `Check-in : ${match.home_team} vs ${match.away_team}`,
  })
  if (pointsError) {
    console.error('[qr/validate] award_points error:', pointsError.code, pointsError.message)
  }

  return NextResponse.json({
    success: true,
    pointsEarned: match.checkin_points,
    match: { home_team: match.home_team, away_team: match.away_team, venue: match.venue },
  })
}
