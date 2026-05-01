import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export interface ClubAdminAuth {
  userId: string
  clubId: string | null
  role: 'club_admin' | 'super_admin'
}

const SUPER_ADMIN_CLUB_COOKIE = 'fanpass_super_admin_club'

/**
 * Verifies the current user is a club_admin or super_admin.
 * Returns { userId, clubId, role } or null if unauthorized.
 * super_admin clubId comes from cookie selection (if set).
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

  let clubId = profile.club_id ?? null
  if (profile.role === 'super_admin') {
    const cookieStore = await cookies()
    const selected = cookieStore.get(SUPER_ADMIN_CLUB_COOKIE)?.value
    if (selected) clubId = selected
  }

  return {
    userId: user.id,
    clubId,
    role: profile.role as ClubAdminAuth['role'],
  }
}

/** Returns the club_id for the current admin (respects super_admin cookie). */
export async function getAdminClubId(): Promise<string | null> {
  const auth = await assertClubAdmin()
  return auth?.clubId ?? null
}

/** Returns the id of the first club in the database (fan-side default). */
export async function getDefaultClubId(): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.from('clubs').select('id').limit(1).single()
  return data?.id ?? null
}

/** Returns full club data including branding (fan-side default). */
export async function getDefaultClub(): Promise<{ id: string; primary_color: string; name: string; logo_url: string | null } | null> {
  const supabase = await createClient()
  const { data } = await supabase.from('clubs').select('id, name, primary_color, logo_url').limit(1).single()
  return data ?? null
}
