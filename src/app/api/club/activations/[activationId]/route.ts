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

  const { error } = await admin.from('activations').update(updatePayload).eq('id', activationId)
  if (error) {
    console.error('[activations PATCH] Supabase error:', error.code, error.message)
    return NextResponse.json({ error: `Erreur DB: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
