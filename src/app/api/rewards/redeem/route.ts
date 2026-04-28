import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { getLoyaltyLevel } from '@/types/database'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { rewardId } = await request.json()
  if (!rewardId) return NextResponse.json({ error: 'Récompense manquante' }, { status: 400 })

  const { data: reward } = await supabase
    .from('rewards')
    .select('*')
    .eq('id', rewardId)
    .single()

  if (!reward || !reward.is_active) {
    return NextResponse.json({ error: 'Récompense indisponible' }, { status: 404 })
  }
  if (reward.expires_at && new Date(reward.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Cette récompense a expiré.' }, { status: 409 })
  }
  if (reward.stock !== null && reward.stock <= 0) {
    return NextResponse.json({ error: 'Stock épuisé.' }, { status: 409 })
  }

  const { data: fanPoints } = await supabase
    .from('fan_points')
    .select('total_points')
    .eq('user_id', user.id)
    .eq('club_id', reward.club_id)
    .maybeSingle()

  const currentPoints = fanPoints?.total_points ?? 0
  const lifetimePts = currentPoints

  if (currentPoints < reward.points_cost) {
    return NextResponse.json({
      error: `Points insuffisants. Il te manque ${reward.points_cost - currentPoints} pts.`,
    }, { status: 409 })
  }

  const userLevel = getLoyaltyLevel(lifetimePts)
  if (reward.min_loyalty_level > userLevel) {
    return NextResponse.json({ error: 'Niveau de fidélité insuffisant pour cette récompense.' }, { status: 403 })
  }

  if (reward.max_per_user !== null) {
    const { count } = await supabase
      .from('redemptions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('reward_id', rewardId)
      .neq('status', 'cancelled')
    if ((count ?? 0) >= reward.max_per_user) {
      return NextResponse.json({ error: 'Tu as atteint la limite d\'échanges pour cette récompense.' }, { status: 409 })
    }
  }

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

  const redemptionCode = randomBytes(2).toString('hex').toUpperCase()

  const { data: redemption, error: redeemError } = await admin
    .from('redemptions')
    .insert({
      user_id: user.id,
      reward_id: rewardId,
      points_spent: reward.points_cost,
      status: 'confirmed',
      expires_at: expiresAt,
      redemption_code: redemptionCode,
    })
    .select('redemption_code')
    .single()

  if (redeemError) {
    console.error('redeem error:', redeemError.code, redeemError.message)
    return NextResponse.json({ error: `Erreur lors de l'échange: ${redeemError.message}` }, { status: 500 })
  }

  // Deduct points
  await admin.rpc('award_points', {
    p_user_id: user.id,
    p_club_id: reward.club_id,
    p_amount: -reward.points_cost,
    p_type: 'redemption',
    p_reference_id: rewardId,
    p_description: `Échange : ${reward.title}`,
  })

  // Decrement stock if limited
  if (reward.stock !== null) {
    await admin.from('rewards').update({ stock: reward.stock - 1 }).eq('id', rewardId)
  }

  return NextResponse.json({
    success: true,
    code: redemption.redemption_code,
    reward: reward.title,
  })
}
