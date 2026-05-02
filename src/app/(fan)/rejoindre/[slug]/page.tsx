import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { JoinForm } from './JoinForm'
import { createClient as createAdminClient } from '@supabase/supabase-js'

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

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Check the user's current role — never overwrite admins
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role

    // Admins who open a fan link → send them to their admin dashboard
    if (role === 'club_admin' || role === 'super_admin') {
      redirect('/club/dashboard')
    }

    // Regular fan: associate with this club
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    await admin
      .from('profiles')
      .update({ club_id: club.id })
      .eq('id', user.id)

    // Ensure fan_points row exists for this club
    await admin.from('fan_points').upsert(
      { user_id: user.id, club_id: club.id, total_points: 0, season_points: 0, lifetime_points: 0 },
      { onConflict: 'user_id,club_id', ignoreDuplicates: true }
    )

    redirect('/home')
  }

  // Not logged in → show signup/login form
  return <JoinForm club={club} />
}
