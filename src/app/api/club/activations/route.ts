import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

async function assertClubAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return p && ['club_admin', 'super_admin'].includes(p.role) ? user : null
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  if (!await assertClubAdmin(supabase)) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const body = await request.json()
  const { match_id, club_id, title, description, type, options, correct_answer, points_reward, status } = body

  if (!match_id || !club_id || !title) {
    return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    console.error('[activations POST] SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 })
  }

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  )

  const { data, error } = await admin.from('activations').insert({
    match_id,
    club_id,
    title,
    description: description || null,
    type: type ?? 'poll',
    options: options?.length ? options : null,
    correct_answer: correct_answer || null,
    points_reward: points_reward ?? 25,
    status: status ?? 'scheduled',
  }).select().single()

  if (error) {
    console.error('[activations POST] Supabase error:', error.code, error.message)
    return NextResponse.json({ error: `Erreur DB: ${error.message}` }, { status: 500 })
  }
  return NextResponse.json({ success: true, activation: data })
}
