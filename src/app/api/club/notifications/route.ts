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
  const { club_id, title, body: msgBody, type, audience, match_id, scheduled_for, send_now } = body

  if (!club_id || !title || !msgBody) {
    return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
  }

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Count recipients based on audience
  let recipientCount = 0
  if (audience === 'all') {
    const { count } = await admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'fan')
    recipientCount = count ?? 0
  } else if (audience === 'checked_in' && match_id) {
    const { count } = await admin.from('checkins').select('*', { count: 'exact', head: true }).eq('match_id', match_id)
    recipientCount = count ?? 0
  } else if (audience === 'gold_plus') {
    // fans with lifetime_points >= 2500
    const { count } = await admin.from('fan_points')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', club_id)
      .gte('lifetime_points', 2500)
    recipientCount = count ?? 0
  }

  const { data, error } = await admin.from('notifications').insert({
    club_id,
    title,
    body: msgBody,
    type: type ?? 'general',
    audience: audience ?? 'all',
    match_id: match_id || null,
    scheduled_for: scheduled_for || null,
    sent_at: send_now ? new Date().toISOString() : null,
    sent_count: send_now ? recipientCount : 0,
  }).select().single()

  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })

  return NextResponse.json({
    success: true,
    notification: data,
    recipientCount: send_now ? recipientCount : 0,
  })
}
