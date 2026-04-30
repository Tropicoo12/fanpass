import { NextRequest, NextResponse } from 'next/server'
import { assertClubAdmin } from '@/lib/club'
import { syncMatchesForClub } from '@/lib/sync-matches'

export async function POST(request: NextRequest) {
  const auth = await assertClubAdmin()
  if (!auth) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { club_id } = await request.json()
  if (!club_id) return NextResponse.json({ error: 'club_id manquant' }, { status: 400 })

  // club_admin can only sync their own club
  if (auth.role !== 'super_admin' && club_id !== auth.clubId)
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const result = await syncMatchesForClub(club_id, true)

  if (result.skipped && result.reason === 'missing_env') {
    return NextResponse.json({ error: 'ODDS_API_KEY non configurée' }, { status: 500 })
  }

  return NextResponse.json({ success: true, ...result })
}
