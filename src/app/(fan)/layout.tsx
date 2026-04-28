import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import type { Database } from '@/types/database'
import { FanNav } from '@/components/FanNav'
import { FanPointsBadge } from '@/components/FanPointsBadge'
import { getDefaultClub } from '@/lib/club'

export default async function FanLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const club = await getDefaultClub()
  const CLUB_ID = club?.id ?? ''
  const primaryColor = club?.primary_color ?? '#10b981'
  const clubName = club?.name ?? 'FanPass'

  const { data: pointsData } = await supabase
    .from('fan_points')
    .select('total_points')
    .eq('user_id', user.id)
    .eq('club_id', CLUB_ID)
    .maybeSingle()

  const totalPoints = pointsData?.total_points ?? 0
  const lifetimePoints = totalPoints

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f1a] to-[#1a1a2e] pb-20" style={{ '--club-color': primaryColor } as React.CSSProperties}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0f0f1a]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏟️</span>
            <span className="font-black text-lg">{clubName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/notifications" className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors">
              <Bell className="w-4 h-4 text-gray-400" />
            </Link>
          <FanPointsBadge
            userId={user.id}
            clubId={CLUB_ID}
            initialPoints={totalPoints}
            initialLifetime={lifetimePoints}
            primaryColor={primaryColor}
          />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 pt-6">
        {children}
      </main>

      <FanNav />
    </div>
  )
}
