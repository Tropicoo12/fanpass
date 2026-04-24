import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { surveyId, answers } = await request.json()
  if (!surveyId) return NextResponse.json({ error: 'Sondage manquant' }, { status: 400 })

  const { data: survey } = await supabase
    .from('surveys')
    .select('id, club_id, points_reward, is_active, expires_at')
    .eq('id', surveyId)
    .single()

  if (!survey || !survey.is_active) {
    return NextResponse.json({ error: 'Sondage indisponible' }, { status: 404 })
  }
  if (survey.expires_at && new Date(survey.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Ce sondage a expiré.' }, { status: 409 })
  }

  const { data: existing } = await supabase
    .from('survey_responses')
    .select('id')
    .eq('user_id', user.id)
    .eq('survey_id', surveyId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Tu as déjà répondu à ce sondage.' }, { status: 409 })
  }

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await admin.from('survey_responses').insert({
    user_id: user.id,
    survey_id: surveyId,
    answers: answers ?? {},
    points_earned: survey.points_reward,
  })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Déjà répondu.' }, { status: 409 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }

  await admin.rpc('award_points', {
    p_user_id: user.id,
    p_club_id: survey.club_id,
    p_amount: survey.points_reward,
    p_type: 'survey',
    p_reference_id: surveyId,
    p_description: 'Réponse à un sondage sponsor',
  })

  // Increment response_count (best-effort)
  const { data: surveyRow } = await admin.from('surveys').select('response_count').eq('id', surveyId).single()
  if (surveyRow) {
    await admin.from('surveys').update({ response_count: surveyRow.response_count + 1 }).eq('id', surveyId)
  }

  return NextResponse.json({ success: true, pointsEarned: survey.points_reward })
}
