import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { assertClubAdmin } from '@/lib/club'
import type { Database } from '@/types/database'

function adminClient() {
  return createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ matchId: string; marketId: string }> }) {
  const auth = await assertClubAdmin()
  if (!auth) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { marketId } = await params
  const admin = adminClient()

  // Verify the market belongs to the admin's club
  if (auth.role !== 'super_admin') {
    const { data: existing } = await admin
      .from('match_markets')
      .select('club_id')
      .eq('id', marketId)
      .single()
    if (!existing) return NextResponse.json({ error: 'Marché introuvable' }, { status: 404 })
    if (existing.club_id !== auth.clubId)
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const body = await request.json()
  const update: Database['public']['Tables']['match_markets']['Update'] = {}
  if (body.is_published !== undefined) update.is_published = body.is_published
  if (body.correct_option !== undefined) update.correct_option = body.correct_option
  if (body.is_settled !== undefined) update.is_settled = body.is_settled

  const { data: market, error } = await admin
    .from('match_markets')
    .update(update)
    .eq('id', marketId)
    .select()
    .single()

  if (error) {
    console.error('[markets PATCH]', error.code, error.message)
    return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 })
  }

  if (body.is_settled === true && body.correct_option) {
    await settleMarket(admin, market)
  }

  return NextResponse.json({ market })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ matchId: string; marketId: string }> }) {
  const auth = await assertClubAdmin()
  if (!auth) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { marketId } = await params
  const admin = adminClient()

  const { data: market } = await admin
    .from('match_markets')
    .select('club_id, is_published')
    .eq('id', marketId)
    .single()

  if (!market) return NextResponse.json({ error: 'Marché introuvable' }, { status: 404 })

  // Verify ownership
  if (auth.role !== 'super_admin' && market.club_id !== auth.clubId)
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  if (market.is_published)
    return NextResponse.json({ error: 'Impossible de supprimer un marché publié' }, { status: 400 })

  const { error } = await admin.from('match_markets').delete().eq('id', marketId)
  if (error) return NextResponse.json({ error: 'Erreur suppression' }, { status: 500 })

  return NextResponse.json({ success: true })
}

async function settleMarket(
  admin: ReturnType<typeof createAdminClient<Database>>,
  market: Database['public']['Tables']['match_markets']['Row']
) {
  const { data: bets } = await admin
    .from('match_bets')
    .select('*')
    .eq('match_market_id', market.id)
    .eq('is_settled', false)

  if (!bets?.length) return

  for (const bet of bets) {
    const isCorrect = bet.selected_option === market.correct_option
    const pointsWon = isCorrect ? bet.potential_win : 0

    await admin.from('match_bets').update({
      is_settled: true,
      is_correct: isCorrect,
      points_won: pointsWon,
    }).eq('id', bet.id)

    if (isCorrect) {
      await admin.rpc('award_points', {
        p_user_id: bet.user_id,
        p_club_id: bet.club_id,
        p_amount: pointsWon,
        p_type: 'activation',
        p_reference_id: bet.match_market_id,
        p_description: `Pari gagnant : ${market.market_label}`,
      })
    }
  }
}
