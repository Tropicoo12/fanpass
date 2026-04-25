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
  if (!await assertClubAdmin(supabase)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { code } = await request.json()
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Code manquant' }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    console.error('[rewards/validate] SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 })
  }

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  )

  const { data: redemption } = await admin
    .from('redemptions')
    .select('*, rewards(title, points_cost, category)')
    .eq('redemption_code', code.trim().toUpperCase())
    .single()

  if (!redemption) {
    return NextResponse.json({ error: 'Code invalide ou introuvable' }, { status: 404 })
  }

  if (redemption.status === 'used') {
    return NextResponse.json({ error: 'Ce code a déjà été utilisé', status: redemption.status }, { status: 409 })
  }

  if (redemption.status === 'cancelled' || redemption.status === 'expired') {
    return NextResponse.json({ error: `Code ${redemption.status}`, status: redemption.status }, { status: 409 })
  }

  if (redemption.expires_at && new Date(redemption.expires_at) < new Date()) {
    await admin.from('redemptions').update({ status: 'expired' }).eq('id', redemption.id)
    return NextResponse.json({ error: 'Code expiré', status: 'expired' }, { status: 409 })
  }

  // Mark as used — permanently invalidated
  const { error } = await admin
    .from('redemptions')
    .update({ status: 'used', used_at: new Date().toISOString() })
    .eq('id', redemption.id)

  if (error) {
    console.error('[rewards/validate] update error:', error.code, error.message)
    return NextResponse.json({ error: `Erreur DB: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    reward: (redemption as any).rewards,
    userId: redemption.user_id,
    pointsSpent: redemption.points_spent,
  })
}
