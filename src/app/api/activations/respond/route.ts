import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { activationId, answer } = await request.json()
  if (!activationId) return NextResponse.json({ error: 'Activation manquante' }, { status: 400 })

  const { data: activation } = await supabase
    .from('activations')
    .select('*')
    .eq('id', activationId)
    .single()

  if (!activation) return NextResponse.json({ error: 'Activation introuvable' }, { status: 404 })
  if (activation.status !== 'active') {
    return NextResponse.json({ error: 'Cette activation n\'est pas ouverte.' }, { status: 409 })
  }
  if (activation.closes_at && new Date(activation.closes_at) < new Date()) {
    return NextResponse.json({ error: 'Cette activation est fermée.' }, { status: 409 })
  }

  const { data: existing } = await supabase
    .from('activation_responses')
    .select('id')
    .eq('user_id', user.id)
    .eq('activation_id', activationId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Tu as déjà répondu à cette activation.' }, { status: 409 })
  }

  const isCorrect = activation.type === 'trivia' && activation.correct_answer
    ? answer === activation.correct_answer
    : null

  const pointsEarned = activation.type === 'trivia'
    ? (isCorrect ? activation.points_reward : 0)
    : activation.points_reward

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await admin.from('activation_responses').insert({
    user_id: user.id,
    activation_id: activationId,
    answer,
    is_correct: isCorrect,
    points_earned: pointsEarned,
  })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Déjà répondu.' }, { status: 409 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }

  if (pointsEarned > 0) {
    await admin.rpc('award_points', {
      p_user_id: user.id,
      p_club_id: activation.club_id,
      p_amount: pointsEarned,
      p_type: 'activation',
      p_reference_id: activationId,
      p_description: `Activation : ${activation.title}`,
    })
  }

  await admin
    .from('activations')
    .update({ response_count: activation.response_count + 1 })
    .eq('id', activationId)

  return NextResponse.json({ success: true, pointsEarned, isCorrect })
}
