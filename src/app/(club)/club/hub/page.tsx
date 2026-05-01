import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PlusCircle, Users, Zap, Building2 } from 'lucide-react'
import { assertClubAdmin } from '@/lib/club'
import { createClient } from '@/lib/supabase/server'
import { ClubHubCard } from '@/components/ClubHubCard'

export const dynamic = 'force-dynamic'

export default async function ClubHubPage() {
  const auth = await assertClubAdmin()
  if (!auth || auth.role !== 'super_admin') {
    redirect('/club/dashboard')
  }

  const supabase = await createClient()

  const { data: clubs } = await supabase
    .from('clubs')
    .select('id, name, city, logo_url, primary_color, secondary_color')
    .order('name')

  if (!clubs) {
    return (
      <div style={{ padding: 32, color: 'rgba(29,29,31,0.5)', fontSize: 14 }}>
        Impossible de charger les clubs.
      </div>
    )
  }

  const clubIds = clubs.map(c => c.id)

  const [fanCountsRes, pointsRes, matchCountsRes, liveMatchesRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('club_id')
      .in('club_id', clubIds.length ? clubIds : ['__none__']),
    supabase
      .from('fan_points')
      .select('club_id, lifetime_points')
      .in('club_id', clubIds.length ? clubIds : ['__none__']),
    supabase
      .from('matches')
      .select('club_id')
      .in('club_id', clubIds.length ? clubIds : ['__none__']),
    supabase
      .from('matches')
      .select('club_id')
      .in('club_id', clubIds.length ? clubIds : ['__none__'])
      .eq('status', 'live'),
  ])

  const fanCountMap: Record<string, number> = {}
  for (const row of fanCountsRes.data ?? []) {
    if (row.club_id) fanCountMap[row.club_id] = (fanCountMap[row.club_id] ?? 0) + 1
  }

  const pointsMap: Record<string, number> = {}
  for (const row of pointsRes.data ?? []) {
    if (row.club_id) pointsMap[row.club_id] = (pointsMap[row.club_id] ?? 0) + (row.lifetime_points ?? 0)
  }

  const matchCountMap: Record<string, number> = {}
  for (const row of matchCountsRes.data ?? []) {
    if (row.club_id) matchCountMap[row.club_id] = (matchCountMap[row.club_id] ?? 0) + 1
  }

  const liveSet = new Set((liveMatchesRes.data ?? []).map(r => r.club_id))

  const totalFans = Object.values(fanCountMap).reduce((a, b) => a + b, 0)
  const totalPoints = Object.values(pointsMap).reduce((a, b) => a + b, 0)
  const totalClubs = clubs.length

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '8px 0 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px', color: '#1d1d1f' }}>Hub FanPass</h1>
          <p style={{ color: 'rgba(29,29,31,0.45)', fontSize: 14, margin: 0 }}>
            Vue globale de tous les clubs sur la plateforme
          </p>
        </div>
        <Link
          href="/club/onboarding"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: 12,
            background: '#1d1d1f',
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <PlusCircle size={16} />
          Nouveau club
        </Link>
      </div>

      {/* Global stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { icon: Building2, label: 'Clubs', value: totalClubs, color: '#059669', bg: '#d1fae5' },
          { icon: Users, label: 'Fans total', value: totalFans.toLocaleString('fr-BE'), color: '#2563eb', bg: '#dbeafe' },
          { icon: Zap, label: 'Points distribués', value: totalPoints.toLocaleString('fr-BE'), color: '#d97706', bg: '#fef3c7' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div
            key={label}
            style={{
              background: '#ffffff',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 14,
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon size={18} color={color} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1d1d1f' }}>{value}</p>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(29,29,31,0.45)' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Club grid */}
      {clubs.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 16,
            padding: 48,
            textAlign: 'center',
          }}
        >
          <Building2 size={32} color="rgba(29,29,31,0.20)" style={{ margin: '0 auto 12px' }} />
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'rgba(29,29,31,0.50)' }}>
            Aucun club pour l&apos;instant
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(29,29,31,0.30)' }}>
            Créez votre premier club pour commencer.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {clubs.map(club => (
            <ClubHubCard
              key={club.id}
              club={club}
              stats={{
                fanCount: fanCountMap[club.id] ?? 0,
                totalPoints: pointsMap[club.id] ?? 0,
                matchCount: matchCountMap[club.id] ?? 0,
                hasLive: liveSet.has(club.id),
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
