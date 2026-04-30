import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Database } from '@/types/database'
import { FanNav } from '@/components/FanNav'
import { getDefaultClub } from '@/lib/club'

export default async function FanLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const club = await getDefaultClub()
  const primaryColor = club?.primary_color ?? '#E1001A'

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: 'var(--font-system, -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif)' }}>
      {children}
      <FanNav primaryColor={primaryColor} />
    </div>
  )
}
