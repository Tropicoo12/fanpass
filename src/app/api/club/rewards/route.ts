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
  const { club_id, title, description, points_cost, stock, category, min_loyalty_level, expires_at, max_per_user } = body

  if (!club_id || !title || points_cost == null) {
    return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
  }
  if (+points_cost <= 0) {
    return NextResponse.json({ error: 'Le coût doit être supérieur à 0' }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    console.error('[rewards POST] SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 })
  }

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  )

  const { data, error } = await admin.from('rewards').insert({
    club_id,
    title,
    description: description || null,
    points_cost: +points_cost,
    stock: stock !== null && stock !== undefined && stock !== '' ? +stock : null,
    category: category ?? 'merchandise',
    min_loyalty_level: +(min_loyalty_level ?? 0),
    expires_at: expires_at || null,
    max_per_user: max_per_user !== null && max_per_user !== undefined && max_per_user !== '' ? +max_per_user : null,
    is_active: true,
    sort_order: 0,
  }).select().single()

  if (error) {
    console.error('[rewards POST] Supabase error:', error.code, error.message, error.details)
    return NextResponse.json({ error: `Erreur DB: ${error.message}` }, { status: 500 })
  }
  return NextResponse.json({ success: true, reward: data })
}
