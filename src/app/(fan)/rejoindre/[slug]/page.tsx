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

  // If already logged in, associate and redirect immediately
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Update club association
    const { error: profileError } = await admin
      .from('profiles')
      .update({ club_id: club.id })
      .eq('id', user.id)

    if (profileError) {
      console.error('[join] profile update failed:', profileError.message)
      // Try upsert as fallback (profile row might not exist yet)
      await admin.from('profiles').upsert({
        id: user.id,
        club_id: club.id,
        role: 'fan',
      }, { onConflict: 'id' })
    }

    // Ensure fan_points row exists for this club
    await admin.from('fan_points').upsert(
      { user_id: user.id, club_id: club.id, total_points: 0, season_points: 0, lifetime_points: 0 },
      { onConflict: 'user_id,club_id', ignoreDuplicates: true }
    )

    redirect('/home')
  }

  return <JoinForm club={club} />
}
