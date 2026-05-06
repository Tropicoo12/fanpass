import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Check if user already got the bonus (has any transactions)
  const { count } = await supabase
    .from('points_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: 'Bonus déjà attribué' }, { status: 409 })
  }

  // Get user's club
  const { data: profile } = await supabase
    .from('profiles')
    .select('club_id')
    .eq('id', user.id)
    .single()

  if (!profile?.club_id) return NextResponse.json({ error: 'Club introuvable' }, { status: 400 })

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await admin.rpc('award_points', {
    p_user_id: user.id,
    p_club_id: profile.club_id,
    p_amount: 50,
    p_type: 'bonus',
    p_reference_id: user.id,
    p_description: 'Bonus de bienvenue 🎉',
  })

  return NextResponse.json({ success: true, points: 50 })
}
