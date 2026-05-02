import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: match } = await supabase.from('matches').select('external_id, status, home_team, away_team').eq('id', matchId).single()
  if (!match) return NextResponse.json({ error: 'Match introuvable' }, { status: 404 })
  if (!match.external_id) return NextResponse.json({ error: 'Aucun ID externe configuré pour ce match' }, { status: 400 })
  if (match.status !== 'live') return NextResponse.json({ error: 'Match non en direct' }, { status: 400 })

  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'API key manquante' }, { status: 500 })

  const res = await fetch(`https://api.football-data.org/v4/matches/${match.external_id}`, {
    headers: { 'X-Auth-Token': apiKey },
    cache: 'no-store',
  })
  if (!res.ok) return NextResponse.json({ error: 'Erreur API Football-Data' }, { status: 502 })

  const data = await res.json()
  const homeScore: number = data.score?.fullTime?.home ?? data.score?.regularTime?.home ?? 0
  const awayScore: number = data.score?.fullTime?.away ?? data.score?.regularTime?.away ?? 0
  const apiStatus: string = data.status ?? ''

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const newStatus = apiStatus === 'FINISHED' ? 'finished' : 'live'
  await admin.from('matches').update({ home_score: homeScore, away_score: awayScore, status: newStatus }).eq('id', matchId)

  return NextResponse.json({ home_score: homeScore, away_score: awayScore, status: newStatus, api_status: apiStatus })
}
