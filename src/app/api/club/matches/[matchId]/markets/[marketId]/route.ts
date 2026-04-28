import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type Profile = Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'role' | 'club_id'>
type MarketUpdate = Database['public']['Tables']['match_markets']['Update']

async function getAdminProfile(supabase: Awaited<ReturnType<typeof createClient>>): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, club_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['club_admin', 'super_admin'].includes(profile.role)) return null
  return profile
}

function canManageClub(profile: Profile, clubId: string) {
  return profile.role === 'super_admin' || profile.club_id === clubId
}

async function getMarketForAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: Profile,
  matchId: string,
  marketId: string
) {
  const { data: market } = await supabase
    .from('match_markets')
    .select('*')
    .eq('id', marketId)
    .eq('match_id', matchId)
    .single()

  if (!market) return { market: null, response: NextResponse.json({ error: 'Marché introuvable' }, { status: 404 }) }
  if (!canManageClub(profile, market.club_id)) {
    return { market: null, response: NextResponse.json({ error: 'Club non autorisé' }, { status: 403 }) }
  }

  return { market, response: null }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string; marketId: string }> }
) {
  const supabase = await createClient()
  const profile = await getAdminProfile(supabase)
  if (!profile) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { matchId, marketId } = await params
  const { market, response } = await getMarketForAdmin(supabase, profile, matchId, marketId)
  if (!market) return response

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    console.error('[market PATCH] SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 })
  }

  const body = await request.json()
  const action = String(body.action ?? '').trim()
  const admin = createAdminClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  if (action === 'settle') {
    return settleMarket(admin, market, String(body.correct_option ?? '').trim())
  }

  const updatePayload: MarketUpdate = {}
  if (action === 'publish') updatePayload.is_published = true
  if (action === 'unpublish') updatePayload.is_published = false
  if (body.is_published !== undefined) updatePayload.is_published = Boolean(body.is_published)
  if (body.closes_at !== undefined) updatePayload.closes_at = body.closes_at || null

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
  }

  const { data: updated, error } = await admin
    .from('match_markets')
    .update(updatePayload)
    .eq('id', market.id)
    .select()
    .single()

  if (error) {
    console.error('[market PATCH] Supabase error:', error.code, error.message)
    return NextResponse.json({ error: `Erreur DB: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({ success: true, market: updated })
}

async function settleMarket(
  admin: ReturnType<typeof createAdminClient<Database>>,
  market: Database['public']['Tables']['match_markets']['Row'],
  correctOption: string
) {
  if (market.is_settled) {
    return NextResponse.json({ error: 'Ce marché est déjà clôturé' }, { status: 409 })
  }
  if (!correctOption) {
    return NextResponse.json({ error: 'Option gagnante requise' }, { status: 400 })
  }

  const { data: bets, error: betsError } = await admin
    .from('match_bets')
    .select('*')
    .eq('match_market_id', market.id)

  if (betsError) {
    console.error('[market settle] bets fetch error:', betsError.code, betsError.message)
    return NextResponse.json({ error: `Erreur DB: ${betsError.message}` }, { status: 500 })
  }

  const { data: updated, error: marketError } = await admin
    .from('match_markets')
    .update({
      is_settled: true,
      is_published: false,
      correct_option: correctOption,
    })
    .eq('id', market.id)
    .select()
    .single()

  if (marketError) {
    console.error('[market settle] market update error:', marketError.code, marketError.message)
    return NextResponse.json({ error: `Erreur DB: ${marketError.message}` }, { status: 500 })
  }

  for (const bet of bets ?? []) {
    const isCorrect = bet.selected_option === correctOption
    const pointsWon = isCorrect ? bet.potential_win : 0

    await admin
      .from('match_bets')
      .update({
        is_settled: true,
        is_correct: isCorrect,
        points_won: pointsWon,
      })
      .eq('id', bet.id)

    if (isCorrect && pointsWon > 0) {
      await admin.rpc('award_points', {
        p_user_id: bet.user_id,
        p_club_id: market.club_id,
        p_amount: pointsWon,
        p_type: 'pronostic',
        p_reference_id: market.id,
        p_description: `Gain marché : ${market.market_label}`,
      })
    }
  }

  return NextResponse.json({ success: true, market: updated, settled_bets: bets?.length ?? 0 })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ matchId: string; marketId: string }> }
) {
  const supabase = await createClient()
  const profile = await getAdminProfile(supabase)
  if (!profile) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { matchId, marketId } = await params
  const { market, response } = await getMarketForAdmin(supabase, profile, matchId, marketId)
  if (!market) return response

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    console.error('[market DELETE] SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 })
  }

  const { count, error: countError } = await supabase
    .from('match_bets')
    .select('id', { count: 'exact', head: true })
    .eq('match_market_id', market.id)

  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 })
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: 'Impossible de supprimer un marché avec des mises' }, { status: 409 })
  }

  const admin = createAdminClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
  const { error } = await admin.from('match_markets').delete().eq('id', market.id)

  if (error) {
    console.error('[market DELETE] Supabase error:', error.code, error.message)
    return NextResponse.json({ error: `Erreur DB: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
