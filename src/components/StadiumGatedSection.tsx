'use client'

import { useStadiumCheck } from '@/hooks/useStadiumCheck'

interface StadiumGatedSectionProps {
  clubId: string | null
  primaryColor: string
}

export function StadiumGatedSection({ clubId, primaryColor }: StadiumGatedSectionProps) {
  const { isInStadium, loading } = useStadiumCheck(clubId)

  if (loading) return null

  if (!isInStadium) {
    return (
      <div
        style={{
          background: '#ffffff',
          borderRadius: 20,
          border: '1px solid rgba(0,0,0,0.08)',
          padding: 20,
          opacity: 0.6,
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 24, margin: '0 0 8px' }}>📍</p>
        <p style={{ fontSize: 14, color: '#1d1d1f', fontWeight: 600, margin: '0 0 4px' }}>
          Paris en direct
        </p>
        <p style={{ fontSize: 13, color: 'rgba(29,29,31,0.55)', margin: 0 }}>
          Disponible uniquement au stade
        </p>
      </div>
    )
  }

  // TODO: fetch markets and render BetRow components when in stadium
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 20,
        border: '1px solid rgba(0,0,0,0.08)',
        padding: 20,
      }}
    >
      <p style={{ fontSize: 14, color: '#1d1d1f', fontWeight: 600, margin: '0 0 12px' }}>
        Paris en direct
      </p>
      <p style={{ fontSize: 13, color: 'rgba(29,29,31,0.55)', margin: 0 }}>
        Chargement des marchés…
      </p>
    </div>
  )
}
