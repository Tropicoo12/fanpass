import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: markets } = await supabase
    .from('match_markets')
    .select('*')
    .eq('match_id', matchId)
    .eq('is_published', true)
    .order('created_at')

  if (!markets || markets.length === 0) return NextResponse.json([])

  // Attach user's existing bet to each market
  let betsByMarket: Record<string, { selected_option: string; odds: number; points_staked: number; is_settled: boolean; points_won: number | null }> = {}
  if (user) {
    const { data: bets } = await supabase
      .from('match_bets')
      .select('match_market_id, selected_option, odds, points_staked, is_settled, points_won')
      .eq('user_id', user.id)
      .in('match_market_id', markets.map(m => m.id))
    bets?.forEach(b => { betsByMarket[b.match_market_id] = b })
  }

  const result = markets.map(m => ({ ...m, myBet: betsByMarket[m.id] ?? null }))
  return NextResponse.json(result)
}
