import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
type RewardUpdate = Database['public']['Tables']['rewards']['Update']

async function assertClubAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return p && ['club_admin', 'super_admin'].includes(p.role) ? user : null
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ rewardId: string }> }) {
  const supabase = await createClient()
  if (!await assertClubAdmin(supabase)) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const body = await request.json()
  const { rewardId } = await params

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const payload: RewardUpdate = {
    ...(body.title !== undefined && { title: body.title }),
    ...(body.description !== undefined && { description: body.description || null }),
    ...(body.points_cost !== undefined && { points_cost: body.points_cost }),
    ...(body.stock !== undefined && { stock: body.stock === '' ? null : body.stock }),
    ...(body.category !== undefined && { category: body.category }),
    ...(body.is_active !== undefined && { is_active: body.is_active }),
    ...(body.min_loyalty_level !== undefined && { min_loyalty_level: body.min_loyalty_level }),
    ...(body.expires_at !== undefined && { expires_at: body.expires_at === '' ? null : body.expires_at }),
    ...(body.max_per_user !== undefined && { max_per_user: body.max_per_user === '' ? null : body.max_per_user }),
  }

  const { error } = await admin.from('rewards').update(payload).eq('id', rewardId)
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })

  return NextResponse.json({ success: true })
}
