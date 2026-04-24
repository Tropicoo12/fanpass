import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

async function assertClubAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['club_admin', 'super_admin'].includes(profile.role)) return null
  return user
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const user = await assertClubAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const body = await request.json()
  const { club_id, home_team, away_team, match_date, venue, checkin_points, prediction_points_exact, prediction_points_winner } = body

  if (!club_id || !home_team || !away_team || !match_date) {
    return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    console.error('[matches POST] SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 })
  }

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  )

  const { data, error } = await admin.from('matches').insert({
    club_id,
    home_team,
    away_team,
    match_date,
    venue: venue || null,
    status: 'upcoming',
    qr_code_token: randomBytes(32).toString('hex'),
    checkin_points: checkin_points ?? 50,
    prediction_points_exact: prediction_points_exact ?? 100,
    prediction_points_winner: prediction_points_winner ?? 30,
  }).select().single()

  if (error) {
    console.error('[matches POST] Supabase error:', error.code, error.message)
    return NextResponse.json({ error: `Erreur DB: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({ success: true, match: data })
}
