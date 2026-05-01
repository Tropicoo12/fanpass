import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { JoinForm } from './JoinForm'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ slug: string }> }

export default async function JoinPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: club } = await supabase
    .from('clubs')
    .select('id, name, slug, primary_color, secondary_color, logo_url')
    .eq('slug', slug)
    .single()

  if (!club) notFound()

  // If already logged in, join and redirect immediately
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    // Associate with this club server-side
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await admin.from('profiles').update({ club_id: club.id }).eq('id', user.id)
    await admin.from('fan_points').upsert(
      { user_id: user.id, club_id: club.id, total_points: 0, season_points: 0, lifetime_points: 0 },
      { onConflict: 'user_id,club_id', ignoreDuplicates: true }
    )
    redirect('/home')
  }

  return <JoinForm club={club} />
}
