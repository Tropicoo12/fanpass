import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database, MarketOption } from '@/types/database'

async function assertClubAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return p && ['club_admin', 'super_admin'].includes(p.role) ? user : null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string; marketId: string }> }
) {
  const { marketId } = await params
  const supabase = await createClient()
  if (!await assertClubAdmin(supabase)) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Config manquante' }, { status: 500 })

  const body = await request.json()
  const { is_active, status, correct_answer, title, options, min_bet, max_bet } = body

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  )

  const update: Database['public']['Tables']['match_markets']['Update'] = {}
  if (title !== undefined) update.title = title
  if (options !== undefined) update.options = options
  if (is_active !== undefined) update.is_active = is_active
  if (min_bet !== undefined) update.min_bet = min_bet
  if (max_bet !== undefined) update.max_bet = max_bet
  if (status !== undefined) update.status = status
  if (correct_answer !== undefined) update.correct_answer = correct_answer

  const { data: market, error: updateError } = await admin
    .from('match_markets')
    .update(update)
    .eq('id', marketId)
    .select()
    .single()

  if (updateError) {
    console.error('[markets PATCH]', updateError.code, updateError.message)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // If settling, award points to winners and mark losers
  if (status === 'settled' && correct_answer) {
    const { data: bets } = await admin
      .from('market_bets')
      .select('*')
      .eq('market_id', marketId)
      .eq('status', 'pending')

    if (bets && bets.length > 0) {
      for (const bet of bets) {
        const won = bet.selection === correct_answer
        const pointsEarned = won ? Math.round(bet.points_bet * bet.odds_at_bet) : 0

        await admin.from('market_bets').update({
          status: won ? 'won' : 'lost',
          points_earned: pointsEarned,
        }).eq('id', bet.id)

        if (won && pointsEarned > 0) {
          const optionsArr = (market.options as MarketOption[]) ?? []
          const opt = optionsArr.find(o => o.name === correct_answer)
          await admin.rpc('award_points', {
            p_user_id: bet.user_id,
            p_club_id: bet.club_id,
            p_amount: pointsEarned,
            p_type: 'pronostic',
            p_reference_id: bet.id,
            p_description: `Pari gagné : ${correct_answer} (x${opt?.odds?.toFixed(2) ?? '?'})`,
          })
        }
      }
    }

    return NextResponse.json({ market, settled: bets?.length ?? 0 })
  }

  return NextResponse.json(market)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string; marketId: string }> }
) {
  const { marketId } = await params
  const supabase = await createClient()
  if (!await assertClubAdmin(supabase)) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Config manquante' }, { status: 500 })

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  )

  const { error } = await admin.from('match_markets').delete().eq('id', marketId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
