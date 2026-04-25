import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
type ActivationUpdate = Database['public']['Tables']['activations']['Update']

async function assertClubAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return p && ['club_admin', 'super_admin'].includes(p.role) ? user : null
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ activationId: string }> }) {
  const supabase = await createClient()
  if (!await assertClubAdmin(supabase)) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const body = await request.json()
  const { activationId } = await params

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    console.error('[activations PATCH] SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 })
  }

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  )

  const updatePayload: ActivationUpdate = {}
  if (body.status !== undefined) updatePayload.status = body.status
  if (body.correct_answer !== undefined) updatePayload.correct_answer = body.correct_answer
  if (body.closes_at !== undefined) updatePayload.closes_at = body.closes_at

  if (body.status === 'active') updatePayload.starts_at = new Date().toISOString()
  if (body.status === 'closed') updatePayload.closes_at = new Date().toISOString()

  const { data: activation, error: fetchError } = await admin
    .from('activations')
    .select('type, correct_answer, points_reward, club_id, title')
    .eq('id', activationId)
    .single()

  if (fetchError || !activation) {
    return NextResponse.json({ error: 'Activation introuvable' }, { status: 404 })
  }

  const { error } = await admin.from('activations').update(updatePayload).eq('id', activationId)
  if (error) {
    console.error('[activations PATCH] Supabase error:', error.code, error.message)
    return NextResponse.json({ error: `Erreur DB: ${error.message}` }, { status: 500 })
  }

  // Auto-award: when closing a trivia activation with a correct answer,
  // grant points to users who answered correctly but received 0 points
  // (this happens when correct_answer was not set at response time)
  const finalCorrectAnswer = body.correct_answer ?? activation.correct_answer
  if (body.status === 'closed' && activation.type === 'trivia' && finalCorrectAnswer) {
    const { data: responses } = await admin
      .from('activation_responses')
      .select('id, user_id, answer, points_earned')
      .eq('activation_id', activationId)

    if (responses) {
      for (const r of responses) {
        const correct = r.answer === finalCorrectAnswer
        const alreadyAwarded = r.points_earned > 0

        if (correct && !alreadyAwarded) {
          await admin
            .from('activation_responses')
            .update({ is_correct: true, points_earned: activation.points_reward })
            .eq('id', r.id)

          await admin.rpc('award_points', {
            p_user_id: r.user_id,
            p_club_id: activation.club_id,
            p_amount: activation.points_reward,
            p_type: 'activation',
            p_reference_id: activationId,
            p_description: `Activation : ${activation.title}`,
          })
        } else if (!correct) {
          await admin
            .from('activation_responses')
            .update({ is_correct: false })
            .eq('id', r.id)
        }
      }
    }
  }

  return NextResponse.json({ success: true })
}
