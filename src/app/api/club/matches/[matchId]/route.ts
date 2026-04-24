import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
type MatchUpdate = Database['public']['Tables']['matches']['Update']

async function assertClubAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['club_admin', 'super_admin'].includes(profile.role)) return null
  return user
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const supabase = await createClient()
  const user = await assertClubAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { matchId } = await params

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    console.error('[matches DELETE] SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 })
  }

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  )

  const { error } = await admin.from('matches').delete().eq('id', matchId)
  if (error) {
    console.error('[matches DELETE] Supabase error:', error.code, error.message)
    return NextResponse.json({ error: `Erreur DB: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const supabase = await createClient()
  const user = await assertClubAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const body = await request.json()
  const { matchId } = await params

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const updatePayload: MatchUpdate = {}
  if (body.status !== undefined) updatePayload.status = body.status
  if (body.home_score !== undefined) updatePayload.home_score = body.home_score
  if (body.away_score !== undefined) updatePayload.away_score = body.away_score

  const { data, error } = await admin
    .from('matches')
    .update(updatePayload)
    .eq('id', matchId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })

  // If match is finished, grade all pronostics
  if (body.status === 'finished' && body.home_score !== undefined && body.away_score !== undefined) {
    await gradePronostics(admin, matchId, body.home_score, body.away_score, data.club_id, data.prediction_points_exact, data.prediction_points_winner)
  }

  return NextResponse.json({ success: true, match: data })
}

async function gradePronostics(
  admin: ReturnType<typeof createAdminClient<Database>>,
  matchId: string,
  homeScore: number,
  awayScore: number,
  clubId: string,
  ptsExact: number,
  ptsWinner: number
) {
  const { data: pronostics } = await admin
    .from('pronostics')
    .select('*')
    .eq('match_id', matchId)
    .is('result', null)

  if (!pronostics?.length) return

  for (const p of pronostics) {
    let result: string
    let pts: number

    const predictedHome = p.predicted_home_score
    const predictedAway = p.predicted_away_score

    if (predictedHome === homeScore && predictedAway === awayScore) {
      result = 'exact'
      pts = ptsExact
    } else {
      const predictedWinner = predictedHome > predictedAway ? 'home' : predictedHome < predictedAway ? 'away' : 'draw'
      const actualWinner = homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : 'draw'
      if (predictedWinner === actualWinner) {
        result = 'winner'
        pts = ptsWinner
      } else {
        result = 'wrong'
        pts = 0
      }
    }

    await admin.from('pronostics').update({
      result,
      points_earned: pts,
      is_correct: result !== 'wrong',
    }).eq('id', p.id)

    if (pts > 0) {
      await admin.rpc('award_points', {
        p_user_id: p.user_id,
        p_club_id: clubId,
        p_amount: pts,
        p_type: 'pronostic',
        p_reference_id: matchId,
        p_description: result === 'exact' ? 'Score exact prédit !' : 'Vainqueur prédit !',
      })
    }
  }
}
