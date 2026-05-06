import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { getAdminClubId } from '@/lib/club'

export async function POST(_: NextRequest, { params }: { params: Promise<{ sponsorId: string }> }) {
  const { sponsorId } = await params
  const clubId = await getAdminClubId()
  if (!clubId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify sponsor belongs to this club
  const { data: sponsor } = await admin
    .from('sponsors')
    .select('id')
    .eq('id', sponsorId)
    .eq('club_id', clubId)
    .single()

  if (!sponsor) return NextResponse.json({ error: 'Sponsor introuvable' }, { status: 404 })

  const newToken = crypto.randomUUID()
  await admin
    .from('sponsors')
    .update({ report_token: newToken } as any)
    .eq('id', sponsorId)

  return NextResponse.json({ token: newToken })
}
