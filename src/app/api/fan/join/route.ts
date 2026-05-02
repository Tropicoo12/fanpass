import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { club_id } = await request.json()
  if (!club_id) return NextResponse.json({ error: 'club_id manquant' }, { status: 400 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Config manquante' }, { status: 500 })

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  )

  // Verify club exists
  const { data: club } = await admin.from('clubs').select('id').eq('id', club_id).single()
  if (!club) return NextResponse.json({ error: 'Club introuvable' }, { status: 404 })

  // Associate fan with club and ensure role is set
  await admin.from('profiles').upsert(
    { id: user.id, club_id, role: 'fan' },
    { onConflict: 'id' }
  )

  // Ensure fan_points row exists for this club
  await admin.from('fan_points').upsert(
    { user_id: user.id, club_id, total_points: 0, season_points: 0, lifetime_points: 0 },
    { onConflict: 'user_id,club_id', ignoreDuplicates: true }
  )

  return NextResponse.json({ success: true })
}
