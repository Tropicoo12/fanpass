import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { assertClubAdmin } from '@/lib/club'
import type { Database } from '@/types/database'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const auth = await assertClubAdmin()
  if (!auth) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { matchId } = await params
  const supabase = await createClient()

  // Verify match belongs to admin's club
  if (auth.role !== 'super_admin') {
    const { data: match } = await supabase
      .from('matches')
      .select('club_id')
      .eq('id', matchId)
      .single()
    if (!match) return NextResponse.json({ error: 'Match introuvable' }, { status: 404 })
    if (match.club_id !== auth.clubId)
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('match_markets')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })

  return NextResponse.json({ markets: data ?? [] })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const auth = await assertClubAdmin()
  if (!auth) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { matchId } = await params
  const body = await request.json()
  const { market_key, market_label, market_emoji, options, closes_at } = body

  if (!market_key || !market_label || !options || !Array.isArray(options) || options.length < 2) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: match } = await supabase
    .from('matches')
    .select('club_id')
    .eq('id', matchId)
    .single()

  if (!match) return NextResponse.json({ error: 'Match introuvable' }, { status: 404 })

  // Verify admin owns this match's club
  if (auth.role !== 'super_admin' && match.club_id !== auth.clubId)
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await admin
    .from('match_markets')
    .insert({
      match_id: matchId,
      club_id: match.club_id,
      market_key,
      market_label,
      market_emoji: market_emoji ?? '🎯',
      options,
      closes_at: closes_at ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('[markets POST]', error.code, error.message)
    return NextResponse.json({ error: 'Erreur création marché' }, { status: 500 })
  }

  return NextResponse.json({ market: data })
}
