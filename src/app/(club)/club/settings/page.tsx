import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Database } from '@/types/database'
import { getAdminClubId } from '@/lib/club'
import { ClubSettingsForm } from './ClubSettingsForm'
import { ClubJoinCard } from './ClubJoinCard'

export default async function SettingsPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const clubId = await getAdminClubId()
  if (!clubId) redirect('/auth/login')

  const { data: club } = await supabase
    .from('clubs')
    .select('*')
    .eq('id', clubId)
    .single()

  if (!club) redirect('/auth/login')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black" style={{ color: '#1d1d1f' }}>Paramètres du club</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(29,29,31,0.55)' }}>
          Identité visuelle et configuration
        </p>
      </div>
      <ClubJoinCard slug={club.slug} clubName={club.name} />
      <ClubSettingsForm club={club} />
    </div>
  )
}
