import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
type MatchUpdate = Database['public']['Tables']['matches']['Update']

function toMatchStatus(apiStatus: string): 'live' | 'finished' | null {
  if (['FINISHED', 'AWARDED'].includes(apiStatus)) return 'finished'
  if (['IN_PLAY', 'PAUSED', 'HALFTIME'].includes(apiStatus)) return 'live'
  return null
}

// Called by the fan home page client component every 60s when a match is live.
// Requires auth (any fan), no CRON_SECRET needed.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { match_id } = await request.json()
  if (!match_id) return NextResponse.json({ error: 'match_id manquant' }, { status: 400 })

  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) return NextResponse.json({ changed: false, reason: 'no_api_key' })

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch the match (verify it's live and has an external_id)
  const { data: match } = await admin
    .from('matches')
    .select('id, status, external_id, home_score, away_score, club_id, prediction_points_exact, prediction_points_winner')
    .eq('id', match_id)
    .eq('status', 'live')
    .not('external_id', 'is', null)
    .single()

  if (!match) return NextResponse.json({ changed: false, reason: 'not_live_or_no_external_id' })

  // Call Football-Data API
  let apiData: any
  try {
    const res = await fetch(`https://api.football-data.org/v4/matches/${match.external_id}`, {
      headers: { 'X-Auth-Token': apiKey },
      cache: 'no-store',
    })
    if (!res.ok) return NextResponse.json({ changed: false, reason: 'api_error' })
    apiData = await res.json()
  } catch {
    return NextResponse.json({ changed: false, reason: 'fetch_failed' })
  }

  const apiStatus: string = apiData.status ?? ''
  const fullTime = apiData.score?.fullTime
  const regularTime = apiData.score?.regularTime
  const homeScore: number | null = fullTime?.home ?? regularTime?.home ?? null
  const awayScore: number | null = fullTime?.away ?? regularTime?.away ?? null
  const newStatus = toMatchStatus(apiStatus)

  const update: MatchUpdate = {}
  if (homeScore !== null && homeScore !== match.home_score) update.home_score = homeScore
  if (awayScore !== null && awayScore !== match.away_score) update.away_score = awayScore
  if (newStatus === 'finished' && match.status !== 'finished') update.status = 'finished'

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ changed: false, home_score: match.home_score, away_score: match.away_score, status: match.status })
  }

  await admin.from('matches').update(update).eq('id', match.id)

  if (update.status === 'finished') {
    // Close open markets
    await admin.from('match_markets')
      .update({ is_published: false } as any)
      .eq('match_id', match.id)
      .eq('is_settled', false)

    // Close active activations
    await admin.from('activations')
      .update({ status: 'closed' })
      .eq('match_id', match.id)
      .eq('status', 'active')
  }

  return NextResponse.json({
    changed: true,
    home_score: homeScore ?? match.home_score,
    away_score: awayScore ?? match.away_score,
    status: update.status ?? match.status,
  })
}
