import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Database } from '@/types/database'
import { ClubSidebarNav, ClubMobileNav } from '@/components/ClubNav'
import { ClubSelector } from '@/components/ClubSelector'
import { getAdminClubId } from '@/lib/club'
import { Zap } from 'lucide-react'

export default async function ClubLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  const clubId = await getAdminClubId()

  // Fetch current club + all clubs (for super_admin selector)
  const { data: allClubs } = await supabase.from('clubs').select('id, name, primary_color').order('name')
  const club = allClubs?.find(c => c.id === clubId) ?? allClubs?.[0] ?? null
  const primaryColor = club?.primary_color ?? '#E1001A'
  const clubName = club?.name ?? 'Mon Club'

  const { data: liveMatch } = await supabase
    .from('matches')
    .select('id, home_team, away_team')
    .eq('status', 'live')
    .limit(1)
    .maybeSingle()

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f5f7',
        display: 'flex',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
        color: '#1d1d1f',
      }}
    >
      {/* SIDEBAR desktop */}
      <aside
        className="hidden lg:flex"
        style={{
          width: 196,
          flexShrink: 0,
          height: '100vh',
          position: 'sticky',
          top: 0,
          background: '#ffffff',
          borderRight: '1px solid rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: primaryColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Zap size={16} color="#ffffff" fill="#ffffff" />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#1d1d1f', lineHeight: 1.2 }}>FanPass</p>
              <p style={{ fontSize: 9, fontWeight: 600, margin: 0, color: 'rgba(29,29,31,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Admin</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <ClubSidebarNav primaryColor={primaryColor} userRole={profile?.role ?? 'club_admin'} />

        {/* Match Day button */}
        <div style={{ padding: '0 12px 12px' }}>
          <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', marginBottom: 12 }} />
          {liveMatch ? (
            <Link
              href={`/club/live/${liveMatch.id}`}
              style={{
                display: 'block',
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                background: primaryColor,
                color: '#ffffff',
                textDecoration: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#fff',
                    display: 'inline-block',
                    animation: 'live-pulse 1.5s infinite',
                  }}
                />
                <span style={{ fontSize: 12, fontWeight: 700 }}>Match en direct</span>
              </div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {liveMatch.home_team} vs {liveMatch.away_team}
              </p>
            </Link>
          ) : (
            <Link
              href="/club/matches"
              style={{
                display: 'block',
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                background: `${primaryColor}10`,
                border: `1px solid ${primaryColor}20`,
                color: primaryColor,
                textDecoration: 'none',
                fontSize: 12,
                fontWeight: 600,
                textAlign: 'center',
              }}
            >
              Mode Match Day
            </Link>
          )}
        </div>

        {/* Club selector */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <ClubSelector
            clubs={allClubs ?? []}
            currentClubId={club?.id ?? ''}
            primaryColor={primaryColor}
            clubName={clubName}
            userRole={profile?.role ?? 'club_admin'}
          />
        </div>
      </aside>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Mobile topbar */}
        <header
          className="lg:hidden"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 40,
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: primaryColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Zap size={14} color="#fff" fill="#fff" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f' }}>FanPass</span>
          </div>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: primaryColor + '18',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              color: primaryColor,
            }}
          >
            {profile?.full_name?.[0]?.toUpperCase() ?? 'A'}
          </div>
        </header>

        <main
          style={{
            flex: 1,
            padding: '24px 28px',
            overflowY: 'auto',
          }}
          className="lg:p-8 pb-24 lg:pb-8"
        >
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            {children}
          </div>
        </main>

        <ClubMobileNav />
      </div>
    </div>
  )
}
