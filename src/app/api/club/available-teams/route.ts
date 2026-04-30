import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchCompetitionTeams, COMPETITIONS } from '@/lib/sync-calendar'

async function assertClubAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return p && ['club_admin', 'super_admin'].includes(p.role) ? user : null
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  if (!await assertClubAdmin(supabase)) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('competition')

  // Return competitions list
  if (!code) return NextResponse.json({ competitions: COMPETITIONS })

  // Return teams for a given competition
  const teams = await fetchCompetitionTeams(code)
  return NextResponse.json({ teams })
}
