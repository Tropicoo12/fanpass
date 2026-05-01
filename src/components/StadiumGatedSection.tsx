'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ScanQrCode } from 'lucide-react'
import { MarketBetCard } from '@/app/(fan)/pronostics/MarketBetCard'
import type { MarketOption } from '@/types/database'

interface MyBet {
  selected_option: string
  odds: number
  points_staked: number
  is_settled: boolean
  points_won: number | null
}

interface Market {
  id: string
  match_id: string
  market_label: string
  market_emoji: string
  options: MarketOption[]
  is_settled: boolean
  closes_at: string | null
  correct_option: string | null
  myBet: MyBet | null
}

interface Props {
  matchId: string | null
  isCheckedIn: boolean
  userPoints: number
  primaryColor: string
}

export function StadiumGatedSection({ matchId, isCheckedIn, userPoints, primaryColor }: Props) {
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!matchId || !isCheckedIn) return
    setLoading(true)
    fetch(`/api/matches/${matchId}/markets`)
      .then(r => r.json())
      .then((data: any[]) => {
        setMarkets(data.map(m => ({
          id: m.id,
          match_id: m.match_id,
          market_label: m.market_label,
          market_emoji: m.market_emoji ?? '⚽',
          options: m.options as MarketOption[],
          is_settled: m.is_settled ?? false,
          closes_at: m.closes_at ?? null,
          correct_option: m.correct_option ?? null,
          myBet: m.myBet ?? null,
        })))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [matchId, isCheckedIn])

  // No live match
  if (!matchId) return null

  // Not checked in — show lock
  if (!isCheckedIn) {
    return (
      <div
        style={{
          background: '#ffffff',
          borderRadius: 20,
          border: '1px solid rgba(0,0,0,0.08)',
          padding: 20,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: '#f5f5f7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}
        >
          <ScanQrCode size={24} color="rgba(29,29,31,0.40)" />
        </div>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f', margin: '0 0 4px' }}>
          Paris en direct
        </p>
        <p style={{ fontSize: 13, color: 'rgba(29,29,31,0.50)', margin: '0 0 14px' }}>
          Scanne le QR au stade pour débloquer les paris
        </p>
        <Link
          href="/scan"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 20px',
            borderRadius: 12,
            background: primaryColor,
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          <ScanQrCode size={14} />
          Scanner le QR
        </Link>
      </div>
    )
  }

  // Checked in — show markets
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 20,
        border: '1px solid rgba(0,0,0,0.08)',
        padding: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#34c759',
            boxShadow: '0 0 0 3px rgba(52,199,89,0.20)',
          }}
        />
        <p style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f', margin: 0 }}>
          Paris en direct
        </p>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#34c759',
            background: 'rgba(52,199,89,0.10)',
            padding: '2px 8px',
            borderRadius: 100,
          }}
        >
          Au stade ✓
        </span>
      </div>

      {loading && (
        <p style={{ fontSize: 13, color: 'rgba(29,29,31,0.40)', textAlign: 'center', padding: '12px 0' }}>
          Chargement…
        </p>
      )}

      {!loading && markets.length === 0 && (
        <p style={{ fontSize: 13, color: 'rgba(29,29,31,0.40)', textAlign: 'center', padding: '8px 0' }}>
          Aucun marché ouvert pour le moment
        </p>
      )}

      {!loading && markets.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {markets.map(market => (
            <MarketBetCard key={market.id} market={market} userPoints={userPoints} />
          ))}
        </div>
      )}
    </div>
  )
}
