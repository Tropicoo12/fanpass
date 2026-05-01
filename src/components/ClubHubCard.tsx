'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, Settings, Loader2, Radio } from 'lucide-react'

interface ClubHubCardProps {
  club: {
    id: string
    name: string
    city: string | null
    logo_url: string | null
    primary_color: string
    secondary_color: string
  }
  stats: {
    fanCount: number
    totalPoints: number
    matchCount: number
    hasLive: boolean
  }
}

export function ClubHubCard({ club, stats }: ClubHubCardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<'dashboard' | 'settings' | null>(null)

  async function selectClub(dest: 'dashboard' | 'settings') {
    setLoading(dest)
    try {
      await fetch('/api/club/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ club_id: club.id }),
      })
      router.push(`/club/${dest}`)
    } catch {
      setLoading(null)
    }
  }

  const initial = club.name.slice(0, 1).toUpperCase()

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 16,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        position: 'relative',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      {/* Live badge */}
      {stats.hasLive && (
        <div
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 20,
            padding: '3px 10px',
            fontSize: 11,
            fontWeight: 700,
            color: '#dc2626',
            letterSpacing: '0.04em',
          }}
        >
          <Radio size={10} />
          LIVE
        </div>
      )}

      {/* Club identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {club.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={club.logo_url}
            alt={club.name}
            style={{
              width: 44,
              height: 44,
              objectFit: 'contain',
              borderRadius: 10,
              background: '#f5f5f7',
              padding: 4,
            }}
          />
        ) : (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: club.primary_color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              fontWeight: 800,
              color: club.secondary_color || '#ffffff',
              flexShrink: 0,
            }}
          >
            {initial}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#1d1d1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {club.name}
          </p>
          {club.city && (
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(29,29,31,0.45)' }}>
              {club.city}
            </p>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 0, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.07)' }}>
        {[
          { label: 'Fans', value: stats.fanCount.toLocaleString('fr-BE') },
          { label: 'Pts distribués', value: stats.totalPoints.toLocaleString('fr-BE') },
          { label: 'Matchs', value: stats.matchCount.toLocaleString('fr-BE') },
        ].map((s, i) => (
          <div
            key={s.label}
            style={{
              flex: 1,
              padding: '10px 8px',
              textAlign: 'center',
              borderLeft: i > 0 ? '1px solid rgba(0,0,0,0.07)' : 'none',
              background: '#f9f9fb',
            }}
          >
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: '#1d1d1f' }}>{s.value}</p>
            <p style={{ margin: 0, fontSize: 10, color: 'rgba(29,29,31,0.45)', marginTop: 2, whiteSpace: 'nowrap' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => selectClub('dashboard')}
          disabled={loading !== null}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '9px 0',
            borderRadius: 10,
            background: '#1d1d1f',
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 600,
            border: 'none',
            cursor: loading !== null ? 'not-allowed' : 'pointer',
            opacity: loading !== null ? 0.7 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {loading === 'dashboard' ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <LayoutDashboard size={14} />}
          Dashboard
        </button>
        <button
          onClick={() => selectClub('settings')}
          disabled={loading !== null}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '9px 0',
            borderRadius: 10,
            background: '#f5f5f7',
            color: '#1d1d1f',
            fontSize: 13,
            fontWeight: 600,
            border: '1px solid rgba(0,0,0,0.08)',
            cursor: loading !== null ? 'not-allowed' : 'pointer',
            opacity: loading !== null ? 0.7 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {loading === 'settings' ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Settings size={14} />}
          Paramètres
        </button>
      </div>
    </div>
  )
}
