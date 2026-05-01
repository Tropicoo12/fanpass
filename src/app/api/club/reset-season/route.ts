import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { assertClubAdmin } from '@/lib/club'
import type { Database } from '@/types/database'

export async function POST() {
  const auth = await assertClubAdmin()
  if (!auth || !auth.clubId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const supabase = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Zero out season_points for all fans of this club, preserve total_points
  const { error } = await supabase
    .from('fan_points')
    .update({ season_points: 0 })
    .eq('club_id', auth.clubId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Record reset timestamp on club
  await supabase
    .from('clubs')
    .update({ season_reset_at: new Date().toISOString() } as any)
    .eq('id', auth.clubId)

  return NextResponse.json({ success: true })
}
