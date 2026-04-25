import { createClient } from '@/lib/supabase/server'

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
