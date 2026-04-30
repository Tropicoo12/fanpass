import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getAdminClubId } from '@/lib/club'
import type { Database } from '@/types/database'

async function assertClubAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return p && ['club_admin', 'super_admin'].includes(p.role) ? user : null
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  if (!await assertClubAdmin(supabase)) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const clubId = await getAdminClubId()
  if (!clubId) return NextResponse.json({ error: 'Club introuvable' }, { status: 404 })

  const body = await request.json()
  const { team_name, football_data_team_id, competition_code } = body

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 })

  const admin = createAdminClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  const { error } = await admin
    .from('clubs')
    .update({
      team_name: team_name ?? undefined,
      football_data_team_id: football_data_team_id ?? undefined,
      competition_code: competition_code ?? undefined,
      // Reset sync time so next page load triggers a fresh sync
      matches_synced_at: null,
    })
    .eq('id', clubId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
