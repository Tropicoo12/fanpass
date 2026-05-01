'use client'
import { useState } from 'react'
import { Loader2, Check, Clock, TrendingUp } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'
import type { MarketOption } from '@/types/database'

interface MyBet {
  selected_option: string; odds: number; points_staked: number
  is_settled: boolean; points_won: number | null
}

interface Market {
  id: string; match_id: string; market_label: string; market_emoji: string
  options: MarketOption[]; is_settled: boolean; closes_at: string | null
  correct_option: string | null; myBet: MyBet | null
}

interface Props { market: Market; userPoints: number }

const BET_STEPS = [25, 50, 100, 200, 500]

export function MarketBetCard({ market, userPoints }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [selection, setSelection] = useState<string>('')
  const [bet, setBet] = useState(50)
  const [loading, setLoading] = useState(false)

  const isClosed = market.is_settled || (!!market.closes_at && new Date(market.closes_at) < new Date())
  const isLocked = !!market.myBet || isClosed

  const chosen = market.options.find(o => o.key === selection)
  const potentialWin = chosen ? Math.round(bet * chosen.odds) : null

  async function submit() {
    if (!selection) { toast('Choisis une option', 'error'); return }
    if (bet > userPoints) { toast(`Solde insuffisant (${userPoints} pts)`, 'error'); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/fan/matches/${market.match_id}/bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market_id: market.id, selected_option: selection, points_staked: bet }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erreur', 'error'); return }
      toast(`Pari enregistré ! Gain potentiel : ${Math.round(bet * (chosen?.odds ?? 1))} pts`, 'success')
      router.refresh()
    } catch { toast('Erreur réseau', 'error') }
    finally { setLoading(false) }
  }

  const existing = market.myBet

  // Status label top-right
  const statusLabel = market.is_settled
    ? '✓ Réglé'
    : isClosed
    ? '⏱ Fermé'
    : existing
    ? '⏳ En attente'
    : '🟢 Ouvert'

  const statusColor = market.is_settled
    ? 'rgba(29,29,31,0.40)'
    : isClosed
    ? '#c8860a'
    : existing
    ? '#c8860a'
    : '#34c759'

  return (
    <div style={{
      background: '#f9f9f9',
      borderRadius: 16,
      border: '1px solid rgba(0,0,0,0.06)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{market.market_emoji}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>{market.market_label}</span>
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, color: statusColor }}>{statusLabel}</span>
      </div>

      <div style={{ padding: '12px 14px' }}>
        {/* Existing bet result */}
        {existing && (
          <div style={{
            background: existing.is_settled && (existing.points_won ?? 0) > 0
              ? 'rgba(52,199,89,0.08)'
              : existing.is_settled
              ? 'rgba(225,0,26,0.06)'
              : 'rgba(200,134,10,0.06)',
            border: `1px solid ${existing.is_settled && (existing.points_won ?? 0) > 0
              ? 'rgba(52,199,89,0.20)'
              : existing.is_settled
              ? 'rgba(225,0,26,0.15)'
              : 'rgba(200,134,10,0.15)'}`,
            borderRadius: 12,
            padding: '10px 12px',
            marginBottom: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f', margin: 0 }}>
                {market.options.find(o => o.key === existing.selected_option)?.label ?? existing.selected_option}
              </p>
              <p style={{ fontSize: 11, color: 'rgba(29,29,31,0.50)', margin: '2px 0 0' }}>
                {existing.points_staked} pts misés · cote ×{existing.odds.toFixed(2)}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              {!existing.is_settled && (
                <p style={{ fontSize: 12, fontWeight: 700, color: '#c8860a', margin: 0 }}>
                  +{Math.round(existing.points_staked * existing.odds)} pts pot.
                </p>
              )}
              {existing.is_settled && (existing.points_won ?? 0) > 0 && (
                <p style={{ fontSize: 14, fontWeight: 800, color: '#34c759', margin: 0 }}>
                  +{existing.points_won} pts
                </p>
              )}
              {existing.is_settled && !(existing.points_won ?? 0) && (
                <p style={{ fontSize: 13, fontWeight: 700, color: '#E1001A', margin: 0 }}>Raté</p>
              )}
            </div>
          </div>
        )}

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {market.options.map(o => {
            const isSelected = selection === o.key
            const isBetOn = existing?.selected_option === o.key
            const isWinner = market.is_settled && market.correct_option === o.key
            const isLoser = market.is_settled && market.correct_option !== null && market.correct_option !== o.key

            let bg = '#ffffff'
            let border = 'rgba(0,0,0,0.08)'
            let labelColor = '#1d1d1f'
            let oddsColor = '#c8860a'

            if (isWinner) { bg = 'rgba(52,199,89,0.08)'; border = 'rgba(52,199,89,0.30)'; oddsColor = '#34c759' }
            else if (isBetOn && !isWinner) { bg = 'rgba(225,0,26,0.05)'; border = 'rgba(225,0,26,0.20)' }
            else if (isSelected) { bg = 'rgba(225,0,26,0.06)'; border = '#E1001A'; labelColor = '#E1001A'; oddsColor = '#E1001A' }
            if (isLoser && !isBetOn) { labelColor = 'rgba(29,29,31,0.30)'; oddsColor = 'rgba(29,29,31,0.25)' }

            return (
              <button
                key={o.key}
                onClick={() => { if (!isLocked) setSelection(o.key) }}
                disabled={isLocked}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: 10,
                  border: `1px solid ${border}`,
                  background: bg,
                  cursor: isLocked ? 'default' : 'pointer',
                  transition: 'all 0.12s',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isBetOn && <Check size={13} color={isWinner ? '#34c759' : '#E1001A'} />}
                  <span style={{ fontSize: 13, fontWeight: 600, color: labelColor }}>{o.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontSize: 13, fontWeight: 800, color: oddsColor,
                    background: isSelected ? 'rgba(225,0,26,0.08)' : 'rgba(200,134,10,0.08)',
                    padding: '2px 7px', borderRadius: 6,
                  }}>
                    ×{o.odds.toFixed(2)}
                  </span>
                  {isWinner && <span style={{ fontSize: 11 }}>✓</span>}
                </div>
              </button>
            )
          })}
        </div>

        {/* Bet amount + confirm */}
        {!isLocked && (
          <div style={{ marginTop: 14 }}>
            {/* Amount picker */}
            <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(29,29,31,0.45)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.3 }}>
              Mise (pts)
            </p>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {BET_STEPS.map(s => {
                const canAfford = s <= userPoints
                const active = bet === s
                return (
                  <button
                    key={s}
                    onClick={() => canAfford && setBet(s)}
                    style={{
                      flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      background: active ? '#1d1d1f' : canAfford ? '#f0f0f0' : '#f5f5f5',
                      color: active ? '#fff' : canAfford ? '#1d1d1f' : 'rgba(29,29,31,0.25)',
                      border: active ? '1px solid #1d1d1f' : '1px solid rgba(0,0,0,0.06)',
                      cursor: canAfford ? 'pointer' : 'not-allowed',
                      transition: 'all 0.1s',
                    }}
                  >
                    {s}
                  </button>
                )
              })}
            </div>

            {/* Potential win */}
            {selection && chosen && (
              <div style={{
                background: 'rgba(52,199,89,0.06)',
                border: '1px solid rgba(52,199,89,0.15)',
                borderRadius: 10,
                padding: '10px 12px',
                marginBottom: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <p style={{ fontSize: 11, color: 'rgba(29,29,31,0.50)', margin: 0 }}>Mise sur "{chosen.label}"</p>
                  <p style={{ fontSize: 11, color: 'rgba(29,29,31,0.40)', margin: '2px 0 0' }}>
                    {bet} pts × {chosen.odds.toFixed(2)}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, color: 'rgba(29,29,31,0.40)', margin: 0 }}>Gain potentiel</p>
                  <p style={{ fontSize: 18, fontWeight: 800, color: '#34c759', margin: '2px 0 0' }}>
                    +{potentialWin?.toLocaleString('fr-BE')} pts
                  </p>
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={submit}
              disabled={loading || !selection}
              style={{
                width: '100%',
                padding: '13px 0',
                borderRadius: 12,
                background: !selection ? '#f0f0f0' : '#1d1d1f',
                color: !selection ? 'rgba(29,29,31,0.30)' : '#fff',
                fontSize: 14,
                fontWeight: 700,
                border: 'none',
                cursor: !selection || loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.12s',
              }}
            >
              {loading
                ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                : <>
                    <TrendingUp size={15} />
                    {selection
                      ? `Miser ${bet} pts${chosen ? ` · gain pot. ${potentialWin}` : ''}`
                      : 'Choisis une option'}
                  </>
              }
            </button>
          </div>
        )}

        {/* Closed state (no bet placed) */}
        {isLocked && !existing && (
          <div style={{ marginTop: 10, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'rgba(29,29,31,0.40)', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <Clock size={12} />
              {market.is_settled ? 'Marché réglé' : 'Les mises sont closes'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
