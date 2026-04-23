import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function generateRedemptionCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { rewardId } = await request.json()
  if (!rewardId) {
    return NextResponse.json({ error: 'Récompense manquante' }, { status: 400 })
  }

  // Récupérer la récompense
  const { data: reward } = await supabase
    .from('rewards')
    .select('id, club_id, title, points_cost, stock, is_active')
    .eq('id', rewardId)
    .single()

  if (!reward || !reward.is_active) {
    return NextResponse.json({ error: 'Récompense indisponible' }, { status: 404 })
  }

  if (reward.stock !== null && reward.stock <= 0) {
    return NextResponse.json({ error: 'Stock épuisé' }, { status: 400 })
  }

  // Vérifier les points du fan
  const { data: fanPoints } = await supabase
    .from('fan_points')
    .select('total_points')
    .eq('user_id', user.id)
    .eq('club_id', reward.club_id)
    .single()

  if (!fanPoints || fanPoints.total_points < reward.points_cost) {
    return NextResponse.json({ error: 'Points insuffisants' }, { status: 400 })
  }

  const code = generateRedemptionCode()

  // Créer la rédemption
  const { error } = await supabase
    .from('redemptions')
    .insert({
      user_id: user.id,
      reward_id: rewardId,
      points_spent: reward.points_cost,
      redemption_code: code,
    })

  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })

  return NextResponse.json({ success: true, code, reward: reward.title })
}
