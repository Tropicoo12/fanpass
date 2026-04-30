import { createClient } from '@/lib/supabase/server'

export interface ClubAdminAuth {
  userId: string
  clubId: string | null
  role: 'club_admin' | 'super_admin'
}

/**
 * Verifies the current user is a club_admin or super_admin.
 * Returns { userId, clubId, role } or null if unauthorized.
 * super_admin has clubId = null and can act across all clubs.
 */
export async function assertClubAdmin(): Promise<ClubAdminAuth | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, club_id')
    .eq('id', user.id)
    .single()
  if (!profile || !['club_admin', 'super_admin'].includes(profile.role)) return null
  if (profile.role === 'club_admin' && !profile.club_id) return null
  return {
    userId: user.id,
    clubId: profile.club_id ?? null,
    role: profile.role as ClubAdminAuth['role'],
  }
}

/** Returns the club_id from the authenticated admin's profile. */
export async function getAdminClubId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('club_id').eq('id', user.id).single()
  return data?.club_id ?? null
}

/** Returns the id of the first club in the database (single-club deployment). */
export async function getDefaultClubId(): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.from('clubs').select('id').limit(1).single()
  return data?.id ?? null
}

/** Returns full club data including branding (single-club deployment). */
export async function getDefaultClub(): Promise<{ id: string; primary_color: string; name: string } | null> {
  const supabase = await createClient()
  const { data } = await supabase.from('clubs').select('id, name, primary_color').limit(1).single()
  return data ?? null
}
