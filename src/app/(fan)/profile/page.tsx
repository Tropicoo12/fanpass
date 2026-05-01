import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Database } from '@/types/database'
import { getDefaultClub } from '@/lib/club'
import { ProfileForm } from './ProfileForm'

export default async function ProfilePage() {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: pointsData }, club] = await Promise.all([
    supabase.from('profiles').select('full_name, username, phone, birth_year').eq('id', user.id).single(),
    supabase.from('fan_points').select('total_points, lifetime_points, season_points').eq('user_id', user.id).limit(1).maybeSingle(),
    getDefaultClub(),
  ])

  const primaryColor = club?.primary_color ?? '#E1001A'

  return (
    <main style={{ background: '#ffffff', minHeight: '100vh', paddingBottom: 90, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '14px 20px' }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#1d1d1f' }}>Mon profil</h1>
      </div>

      <div style={{ maxWidth: 430, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ background: '#ffffff', borderRadius: 20, border: '1px solid rgba(0,0,0,0.08)', padding: 24, textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: primaryColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
            fontSize: 28, fontWeight: 800, color: '#fff',
          }}>
            {profile?.full_name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', margin: '0 0 4px' }}>
            {profile?.full_name ?? 'Fan anonyme'}
          </p>
          <p style={{ fontSize: 13, color: 'rgba(29,29,31,0.45)', margin: '0 0 20px' }}>{user.email}</p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            {[
              { label: 'Points', value: (pointsData?.total_points ?? 0).toLocaleString('fr-BE') },
              { label: 'Saison', value: (pointsData?.season_points ?? 0).toLocaleString('fr-BE') },
              { label: 'Vie', value: (pointsData?.lifetime_points ?? 0).toLocaleString('fr-BE') },
            ].map(s => (
              <div key={s.label}>
                <p style={{ fontSize: 18, fontWeight: 800, color: '#1d1d1f', margin: 0 }}>{s.value}</p>
                <p style={{ fontSize: 11, color: 'rgba(29,29,31,0.40)', margin: '2px 0 0' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <ProfileForm
          initialData={{
            full_name: profile?.full_name ?? '',
            username: profile?.username ?? '',
            phone: profile?.phone ?? '',
            birth_year: profile?.birth_year ?? null,
          }}
          primaryColor={primaryColor}
        />
      </div>
    </main>
  )
}
