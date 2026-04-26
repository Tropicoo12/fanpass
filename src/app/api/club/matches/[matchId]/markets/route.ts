import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

async function assertClubAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('role, club_id').eq('id', user.id).single()
  return p && ['club_admin', 'super_admin'].includes(p.role) ? { user, clubId: p.club_id } : null
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params
  const supabase = await createClient()
  const { data: markets } = await supabase
    .from('match_markets')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at')
  return NextResponse.json(markets ?? [])
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params
  const supabase = await createClient()
  const admin_info = await assertClubAdmin(supabase)
  if (!admin_info) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Config manquante' }, { status: 500 })

  const body = await request.json()
  const { title, market_type, options, min_bet, max_bet } = body

  if (!title || !options || !Array.isArray(options) || options.length < 2) {
    return NextResponse.json({ error: 'title et options (min 2) requis' }, { status: 400 })
  }

  const { data: match } = await supabase.from('matches').select('club_id').eq('id', matchId).single()
  if (!match) return NextResponse.json({ error: 'Match introuvable' }, { status: 404 })

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  )

  const { data, error } = await admin.from('match_markets').insert({
    match_id: matchId,
    club_id: match.club_id,
    market_type: market_type ?? 'custom',
    title,
    options,
    is_active: true,
    min_bet: min_bet ?? 25,
    max_bet: max_bet ?? 500,
    status: 'open',
  }).select().single()

  if (error) {
    console.error('[markets POST]', error.code, error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
